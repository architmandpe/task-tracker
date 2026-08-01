"""Google sign-in, server-side authorization code flow.

The browser never handles a token: it bounces to Google and back to
/auth/google/callback with a one-time code, which this module exchanges for an
ID token over a direct server-to-server call. The session that comes out the
other side is the same httpOnly JWT cookie the password login issues, so
everything downstream (/auth/me, the agent's internal calls) is unchanged.
"""
import os
import datetime as dt
from urllib.parse import urlencode

import httpx
from jose import jwt, JWTError

AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
CERTS_ENDPOINT = "https://www.googleapis.com/oauth2/v3/certs"
# Google mints ID tokens under both spellings.
VALID_ISSUERS = ("https://accounts.google.com", "accounts.google.com")

STATE_TTL = dt.timedelta(minutes=10)
STATE_COOKIE = "google_oauth_state"


class GoogleAuthError(Exception):
    """Raised when the handshake can't be completed or trusted."""


def is_configured() -> bool:
    return bool(os.environ.get("GOOGLE_CLIENT_ID") and os.environ.get("GOOGLE_CLIENT_SECRET"))


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise GoogleAuthError(f"{name} is not set")
    return value


def redirect_uri(request_base_url: str) -> str:
    """Where Google sends the browser back to. Pinned by GOOGLE_REDIRECT_URI when
    set (prod, behind a proxy that knows its own public hostname); otherwise
    derived from the incoming request so localhost just works."""
    configured = os.environ.get("GOOGLE_REDIRECT_URI")
    if configured:
        return configured
    return request_base_url.rstrip("/") + "/auth/google/callback"


MODES = ("login", "signup")


def mint_state(mode: str) -> str:
    """A signed, short-lived nonce. It rides in both the redirect and a cookie;
    the callback only proceeds if the two match, which is what stops an attacker
    from feeding us their own authorization code (CSRF).

    It also carries whether the user pressed sign up or log in. Google echoes
    only `state` back, so this is the one channel that survives the round trip -
    and because it's signed, the mode can't be tampered with en route."""
    now = dt.datetime.now(dt.timezone.utc)
    return jwt.encode(
        {
            "purpose": "google_oauth_state",
            "mode": mode if mode in MODES else "login",
            "iat": now,
            "exp": now + STATE_TTL,
        },
        os.environ["JWT_SECRET"],
        algorithm="HS256",
    )


def verify_state(state_param: str | None, state_cookie: str | None) -> str:
    """Returns the mode the handshake started in."""
    if not state_param or not state_cookie or state_param != state_cookie:
        raise GoogleAuthError("state mismatch")
    try:
        claims = jwt.decode(state_param, os.environ["JWT_SECRET"], algorithms=["HS256"])
    except JWTError as exc:
        raise GoogleAuthError("state invalid or expired") from exc
    if claims.get("purpose") != "google_oauth_state":
        raise GoogleAuthError("state invalid")
    return claims.get("mode", "login")


def authorization_url(state: str, redirect_to: str) -> str:
    params = {
        "client_id": _require("GOOGLE_CLIENT_ID"),
        "redirect_uri": redirect_to,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        # Google skips the account chooser on repeat visits otherwise, which
        # makes switching accounts impossible without signing out of Google.
        "prompt": "select_account",
    }
    return f"{AUTH_ENDPOINT}?{urlencode(params)}"


def exchange_code(code: str, redirect_to: str) -> str:
    """Trades the one-time code for an ID token. Returns the raw JWT."""
    try:
        resp = httpx.post(
            TOKEN_ENDPOINT,
            data={
                "code": code,
                "client_id": _require("GOOGLE_CLIENT_ID"),
                "client_secret": _require("GOOGLE_CLIENT_SECRET"),
                "redirect_uri": redirect_to,
                "grant_type": "authorization_code",
            },
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        raise GoogleAuthError("could not reach Google") from exc

    if resp.status_code != 200:
        raise GoogleAuthError("Google rejected the authorization code")
    id_token = resp.json().get("id_token")
    if not id_token:
        raise GoogleAuthError("Google returned no id_token")
    return id_token


def _signing_key(id_token: str) -> dict:
    """Google's public key matching this token's kid."""
    try:
        kid = jwt.get_unverified_header(id_token).get("kid")
    except JWTError as exc:
        raise GoogleAuthError("malformed id_token") from exc
    try:
        keys = httpx.get(CERTS_ENDPOINT, timeout=10.0).json()["keys"]
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise GoogleAuthError("could not fetch Google's signing keys") from exc
    for key in keys:
        if key.get("kid") == kid:
            return key
    raise GoogleAuthError("id_token signed by an unknown key")


def verify_id_token(id_token: str) -> tuple[str, str]:
    """Checks the signature, issuer, audience and expiry, then returns
    (google_sub, email). An unverified Google address is refused: without that
    check anyone could register the address and claim an existing account."""
    try:
        claims = jwt.decode(
            id_token,
            _signing_key(id_token),
            algorithms=["RS256"],
            audience=_require("GOOGLE_CLIENT_ID"),
            options={"verify_at_hash": False},
        )
    except JWTError as exc:
        raise GoogleAuthError("id_token failed verification") from exc

    if claims.get("iss") not in VALID_ISSUERS:
        raise GoogleAuthError("id_token has the wrong issuer")

    email = claims.get("email")
    sub = claims.get("sub")
    if not email or not sub:
        raise GoogleAuthError("id_token is missing email or sub")
    if not claims.get("email_verified"):
        raise GoogleAuthError("that Google account's email address isn't verified")

    return sub, email.lower()
