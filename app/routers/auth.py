from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.deps import get_session
from app.schemas import SignupIn, TokenOut
from app.security import hash_password, verify_password, mint_token
from app.repositories.user_repo import UserRepository
from fastapi import Response

router = APIRouter(prefix="/auth", tags=["auth"])

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
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid credentials")
    token = mint_token(user.id)
    response.set_cookie(key="access_token", value=token, httponly=True, samesite="lax")
    return {"status": "logged in"}

