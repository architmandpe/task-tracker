"""Google sign-in. Google itself is mocked at the network boundary only - the
tokens here are really RS256-signed and really verified, so the security-critical
path (signature, audience, issuer, email_verified) is under test rather than
stubbed out."""
import datetime as dt
import os
from uuid import uuid4

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from jose import jwk, jwt

from app import google_oauth
from app.main import app

CLIENT_ID = "test-client-id.apps.googleusercontent.com"
KID = "test-key"

client = TestClient(app)

_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
PRIVATE_PEM = _key.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.PKCS8,
    serialization.NoEncryption(),
).decode()
PUBLIC_PEM = _key.public_key().public_bytes(
    serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
).decode()

PUBLIC_JWK = {**jwk.construct(PUBLIC_PEM, "RS256").to_dict(), "kid": KID, "alg": "RS256"}
# jose emits bytes for the modulus/exponent; Google's endpoint serves strings.
PUBLIC_JWK = {k: (v.decode() if isinstance(v, bytes) else v) for k, v in PUBLIC_JWK.items()}


def make_id_token(*, sub="google-sub-1", email="someone@gmail.com", email_verified=True, aud=CLIENT_ID, iss="https://accounts.google.com"):
    now = dt.datetime.now(dt.timezone.utc)
    return jwt.encode(
        {
            "sub": sub,
            "email": email,
            "email_verified": email_verified,
            "aud": aud,
            "iss": iss,
            "iat": now,
            "exp": now + dt.timedelta(minutes=5),
        },
        PRIVATE_PEM,
        algorithm="RS256",
        headers={"kid": KID},
    )


@pytest.fixture
def google_env(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", CLIENT_ID)
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-secret")
    monkeypatch.delenv("GOOGLE_REDIRECT_URI", raising=False)


@pytest.fixture
def google_network(monkeypatch):
    """Stands in for Google's token and certs endpoints."""
    state = {"id_token": make_id_token(), "token_status": 200}

    class FakeResponse:
        def __init__(self, payload, status_code=200):
            self._payload = payload
            self.status_code = status_code

        def json(self):
            return self._payload

    def fake_post(url, **kwargs):
        assert url == google_oauth.TOKEN_ENDPOINT
        if state["token_status"] != 200:
            return FakeResponse({"error": "invalid_grant"}, state["token_status"])
        return FakeResponse({"id_token": state["id_token"]})

    def fake_get(url, **kwargs):
        assert url == google_oauth.CERTS_ENDPOINT
        return FakeResponse({"keys": [PUBLIC_JWK]})

    monkeypatch.setattr(google_oauth.httpx, "post", fake_post)
    monkeypatch.setattr(google_oauth.httpx, "get", fake_get)
    return state


def start_handshake(mode="login"):
    """Runs /auth/google/start and returns the state cookie Google would echo."""
    resp = client.get(f"/auth/google/start?mode={mode}", follow_redirects=False)
    assert resp.status_code == 302
    return resp, resp.cookies[google_oauth.STATE_COOKIE]


def fresh_identity(label):
    """A Google identity nobody has used before. The test database persists
    between runs, and signing up twice under one address is now refused, so
    fixed addresses would make these tests pass only on a clean database."""
    token = uuid4().hex[:8]
    return f"google-sub-{label}-{token}", f"{label}-{token}@gmail.com"


def sign_up_with_google(network, sub, email):
    """A first-time Google registration, end to end."""
    network["id_token"] = make_id_token(sub=sub, email=email)
    _, state = start_handshake("signup")
    return client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)


def teardown_function():
    client.cookies.clear()


def test_providers_reports_google_off_when_unconfigured(monkeypatch):
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    monkeypatch.delenv("GOOGLE_CLIENT_SECRET", raising=False)
    assert client.get("/auth/providers").json() == {"google": False}


def test_providers_reports_google_on_when_configured(google_env):
    assert client.get("/auth/providers").json() == {"google": True}


def test_start_is_unavailable_when_unconfigured(monkeypatch):
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    monkeypatch.delenv("GOOGLE_CLIENT_SECRET", raising=False)
    assert client.get("/auth/google/start", follow_redirects=False).status_code == 503


def test_start_redirects_to_google_with_state(google_env):
    resp, state_cookie = start_handshake()
    location = resp.headers["location"]
    assert location.startswith(google_oauth.AUTH_ENDPOINT)
    assert f"client_id={CLIENT_ID}" in location
    assert "scope=openid+email+profile" in location
    assert f"state={state_cookie}" in location
    assert "auth%2Fgoogle%2Fcallback" in location


def test_callback_creates_a_user_and_logs_in(google_env, google_network):
    sub, email = fresh_identity("new")
    resp = sign_up_with_google(google_network, sub, email)
    assert resp.status_code == 302
    assert resp.headers["location"] == "/"
    assert client.get("/auth/me").json()["email"] == email


def test_second_sign_in_reuses_the_same_account(google_env, google_network):
    sub, email = fresh_identity("repeat")
    sign_up_with_google(google_network, sub, email)
    first_id = client.get("/auth/me").json()["id"]

    client.cookies.clear()
    _, state = start_handshake()
    client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert client.get("/auth/me").json()["id"] == first_id


def test_google_links_to_an_existing_password_account(google_env, google_network):
    sub, email = fresh_identity("linkme")
    client.post("/auth/signup", json={"email": email, "password": "supersecret"})
    client.post("/auth/login", json={"email": email, "password": "supersecret"})
    password_id = client.get("/auth/me").json()["id"]
    client.cookies.clear()

    google_network["id_token"] = make_id_token(sub=sub, email=email)
    _, state = start_handshake()
    client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)

    # Same account, not a duplicate - the tasks created with the password are
    # still there after signing in with Google.
    assert client.get("/auth/me").json()["id"] == password_id


def test_password_login_is_refused_for_a_google_only_account(google_env, google_network):
    sub, email = fresh_identity("nopassword")
    sign_up_with_google(google_network, sub, email)
    client.cookies.clear()

    resp = client.post("/auth/login", json={"email": email, "password": "anything123"})
    assert resp.status_code == 401
    assert "Google" in resp.json()["detail"]


def test_callback_rejects_a_mismatched_state(google_env, google_network):
    start_handshake()
    resp = client.get("/auth/google/callback?code=abc&state=not-the-one", follow_redirects=False)
    assert resp.headers["location"] == "/?google=failed"
    assert client.get("/auth/me").status_code == 401


def test_callback_rejects_a_missing_state_cookie(google_env, google_network):
    _, state = start_handshake()
    client.cookies.clear()  # cookie gone, param still present
    resp = client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert resp.headers["location"] == "/?google=failed"


def test_callback_reports_a_cancelled_consent_screen(google_env):
    resp = client.get("/auth/google/callback?error=access_denied", follow_redirects=False)
    assert resp.headers["location"] == "/?google=cancelled"


def test_callback_rejects_an_unverified_email(google_env, google_network):
    google_network["id_token"] = make_id_token(sub="google-sub-unverified", email="spoof@gmail.com", email_verified=False)  # never created
    _, state = start_handshake("signup")
    resp = client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert resp.headers["location"] == "/?google=failed"
    assert client.get("/auth/me").status_code == 401


def test_callback_rejects_a_token_for_another_audience(google_env, google_network):
    google_network["id_token"] = make_id_token(aud="someone-elses-client-id")
    _, state = start_handshake()
    resp = client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert resp.headers["location"] == "/?google=failed"


def test_callback_rejects_a_token_from_the_wrong_issuer(google_env, google_network):
    google_network["id_token"] = make_id_token(iss="https://evil.example.com")
    _, state = start_handshake()
    resp = client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert resp.headers["location"] == "/?google=failed"


def test_callback_rejects_a_token_signed_by_the_wrong_key(google_env, google_network):
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    other_pem = other.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()
    now = dt.datetime.now(dt.timezone.utc)
    google_network["id_token"] = jwt.encode(
        {"sub": "forged", "email": "forged@gmail.com", "email_verified": True,
         "aud": CLIENT_ID, "iss": "https://accounts.google.com",
         "iat": now, "exp": now + dt.timedelta(minutes=5)},
        other_pem,
        algorithm="RS256",
        headers={"kid": KID},  # claims to be Google's key, isn't signed by it
    )
    _, state = start_handshake()
    resp = client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert resp.headers["location"] == "/?google=failed"
    assert client.get("/auth/me").status_code == 401


def test_callback_handles_google_rejecting_the_code(google_env, google_network):
    google_network["token_status"] = 400
    _, state = start_handshake()
    resp = client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert resp.headers["location"] == "/?google=failed"


def test_redirect_uri_prefers_the_configured_value(monkeypatch):
    monkeypatch.setenv("GOOGLE_REDIRECT_URI", "https://cadence.example.com/auth/google/callback")
    assert google_oauth.redirect_uri("http://testserver/") == "https://cadence.example.com/auth/google/callback"
    monkeypatch.delenv("GOOGLE_REDIRECT_URI")
    assert google_oauth.redirect_uri("http://testserver/") == "http://testserver/auth/google/callback"


# --- sign up and log in mean different things -------------------------------

def test_signup_is_refused_when_the_google_account_already_exists(google_env, google_network):
    sub, email = fresh_identity("dup")
    sign_up_with_google(google_network, sub, email)
    assert client.get("/auth/me").status_code == 200
    client.cookies.clear()

    # Same person pressing "Sign up with Google" a second time.
    resp = sign_up_with_google(google_network, sub, email)
    assert resp.headers["location"] == "/?google=exists"
    assert client.get("/auth/me").status_code == 401


def test_signup_is_refused_when_a_password_account_owns_the_email(google_env, google_network):
    sub, email = fresh_identity("already")
    client.post("/auth/signup", json={"email": email, "password": "supersecret"})
    client.cookies.clear()

    resp = sign_up_with_google(google_network, sub, email)
    assert resp.headers["location"] == "/?google=exists"
    assert client.get("/auth/me").status_code == 401


def test_login_is_refused_when_there_is_no_account_yet(google_env, google_network):
    sub, email = fresh_identity("stranger")
    google_network["id_token"] = make_id_token(sub=sub, email=email)
    _, state = start_handshake("login")
    resp = client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert resp.headers["location"] == "/?google=nouser"
    assert client.get("/auth/me").status_code == 401


def test_login_works_once_the_account_exists(google_env, google_network):
    sub, email = fresh_identity("returning")
    sign_up_with_google(google_network, sub, email)
    created_id = client.get("/auth/me").json()["id"]
    client.cookies.clear()

    _, state = start_handshake("login")
    resp = client.get(f"/auth/google/callback?code=abc&state={state}", follow_redirects=False)
    assert resp.headers["location"] == "/"
    assert client.get("/auth/me").json()["id"] == created_id


def test_mode_survives_the_round_trip_inside_the_signed_state(google_env):
    """The mode can't ride in the URL - Google echoes only `state` - and being
    signed, it can't be swapped for the other one en route."""
    resp, state = start_handshake("signup")
    assert google_oauth.verify_state(state, state) == "signup"
    resp, state = start_handshake("login")
    assert google_oauth.verify_state(state, state) == "login"


def test_an_unknown_mode_falls_back_to_login(google_env):
    _, state = start_handshake("wharrgarbl")
    assert google_oauth.verify_state(state, state) == "login"
