from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app import google_oauth
from app.deps import get_session, get_current_user
from app.schemas import SignupIn, TokenOut
from app.security import hash_password, verify_password, mint_token
from app.repositories.user_repo import UserRepository
from fastapi import Response

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_COOKIE = "access_token"


def start_session(response: Response, user_id: int) -> None:
    """The one place a session cookie is issued - password and Google logins
    have to stay identical here, or /auth/me starts behaving differently
    depending on how you signed in."""
    response.set_cookie(
        key=SESSION_COOKIE,
        value=mint_token(user_id),
        httponly=True,
        samesite="lax",
    )


@router.get("/me")
def me(user=Depends(get_current_user)):
    return {"id": user.id, "email": user.email}

@router.get("/providers")
def providers():
    """Lets the login screen show the Google button only when the server is
    actually configured for it, instead of offering a button that 500s."""
    return {"google": google_oauth.is_configured()}

@router.post("/signup", status_code=201)
def signup(body: SignupIn, session: Session = Depends(get_session)):
    users = UserRepository(session)
    if users.get_by_email(body.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "email already registered")
    users.create(email=body.email, password_hash=hash_password(body.password))
    return {"status": "registered"}


@router.post("/login")
def login(body: SignupIn, response: Response, session: Session = Depends(get_session)):
    user = UserRepository(session).get_by_email(body.email)
    # A Google-only account has no hash to compare against - say so rather than
    # letting passlib raise on None.
    if user is not None and user.password_hash is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "this account uses Google sign-in")
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid credentials")
    start_session(response, user.id)
    return {"status": "logged in"}


@router.get("/google/start")
def google_start(request: Request, mode: str = "login"):
    """Kicks off the handshake: stash a signed nonce in a cookie and bounce the
    browser to Google's consent screen carrying the same value. `mode` records
    which button was pressed so the callback can hold sign up and log in to
    their own meaning."""
    if not google_oauth.is_configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Google sign-in is not configured")

    state = google_oauth.mint_state(mode)
    target = google_oauth.redirect_uri(str(request.base_url))
    response = RedirectResponse(google_oauth.authorization_url(state, target), status_code=302)
    response.set_cookie(
        key=google_oauth.STATE_COOKIE,
        value=state,
        httponly=True,
        samesite="lax",
        max_age=int(google_oauth.STATE_TTL.total_seconds()),
    )
    return response


@router.get("/google/callback")
def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    session: Session = Depends(get_session),
):
    """Google sends the browser back here. Everything lands on the login screen
    with a message rather than a raw error page, since this is a top-level
    navigation the user is watching."""
    if error or not code:
        # The user hitting "cancel" on the consent screen arrives here too.
        return _failed("cancelled" if error == "access_denied" else "failed")

    try:
        mode = google_oauth.verify_state(state, request.cookies.get(google_oauth.STATE_COOKIE))
        id_token = google_oauth.exchange_code(code, google_oauth.redirect_uri(str(request.base_url)))
        google_sub, email = google_oauth.verify_id_token(id_token)
    except google_oauth.GoogleAuthError:
        return _failed("failed")

    users = UserRepository(session)
    user = users.get_by_google_sub(google_sub)
    existing = user or users.get_by_email(email)

    # Sign up and log in are held to their word rather than collapsed into one
    # "continue" action: signing up into an account you already have, or logging
    # in to one that doesn't exist yet, is a mistake worth naming.
    if mode == "signup" and existing is not None:
        return _failed("exists")
    if mode == "login" and existing is None:
        return _failed("nouser")

    if user is None:
        # Same verified address, so this is the same person coming back through
        # a different door - link rather than colliding on the unique email.
        user = users.link_google(existing, google_sub) if existing else users.create(
            email=email, google_sub=google_sub
        )

    response = RedirectResponse("/", status_code=302)
    start_session(response, user.id)
    response.delete_cookie(key=google_oauth.STATE_COOKIE)
    return response


def _failed(reason: str) -> RedirectResponse:
    response = RedirectResponse(f"/?google={reason}", status_code=302)
    response.delete_cookie(key=google_oauth.STATE_COOKIE)
    return response


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=SESSION_COOKIE)
    return {"status": "logged out"}
