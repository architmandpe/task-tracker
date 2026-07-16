from passlib.context import CryptContext

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd.verify(plain, hashed)

import datetime as dt
from jose import jwt

SECRET = "dev-secret-change-me"  # TODO: move to env var
ALGORITHM = "HS256"
TOKEN_TTL = dt.timedelta(hours=12)

def mint_token(user_id: int) -> str:
    now = dt.datetime.now(dt.timezone.utc)
    claims = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + TOKEN_TTL,
    }
    return jwt.encode(claims, SECRET, algorithm=ALGORITHM)

def decode_token(token: str) -> int:
    payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    return int(payload["sub"])
