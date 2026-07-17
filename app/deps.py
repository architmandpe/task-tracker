from collections.abc import Iterator
from sqlalchemy.orm import Session
from app.db import SessionLocal
from fastapi import Depends, HTTPException, status
from jose import JWTError
from app.security import decode_token
from app.repositories.user_repo import UserRepository
from fastapi import Cookie

def get_session() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def get_current_user(access_token: str | None = Cookie(default=None), session: Session = Depends(get_session)):
    creds_error = HTTPException(status.HTTP_401_UNAUTHORIZED, "could not validate credentials")
    if access_token is None:
        raise creds_error
    try:
        user_id = decode_token(access_token)
    except JWTError:
        raise creds_error
    user = UserRepository(session).get(user_id)
    if user is None:
        raise creds_error
    return user
