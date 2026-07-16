from collections.abc import Iterator
from sqlalchemy.orm import Session
from app.db import SessionLocal
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from app.security import decode_token
from app.repositories.user_repo import UserRepository

def get_session() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

oauth2 = OAuth2PasswordBearer(tokenUrl="auth/login")  # tells FastAPI/Swagger where to get a token

def get_current_user(token: str = Depends(oauth2), session: Session = Depends(get_session)):
    creds_error = HTTPException(status.HTTP_401_UNAUTHORIZED, "could not validate credentials",
                               headers={"WWW-Authenticate": "Bearer"})
    try:
        user_id = decode_token(token)        # verifies signature + expiry
    except JWTError:
        raise creds_error
    user = UserRepository(session).get(user_id)
    if user is None:
        raise creds_error
    return user