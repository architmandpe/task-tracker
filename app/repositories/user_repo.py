from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models import User

class UserRepository:
    def __init__(self, session: Session):
        self.session = session

    def get(self, user_id: int) -> User | None:
        return self.session.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        return self.session.scalars(stmt).first()

    def get_by_google_sub(self, google_sub: str) -> User | None:
        stmt = select(User).where(User.google_sub == google_sub)
        return self.session.scalars(stmt).first()

    def create(self, *, email: str, password_hash: str | None = None, google_sub: str | None = None) -> User:
        user = User(email=email, password_hash=password_hash, google_sub=google_sub)
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    def link_google(self, user: User, google_sub: str) -> User:
        """Attaches a Google identity to an account that already exists under
        the same address - signing in with Google shouldn't strand someone from
        the tasks they created with a password."""
        user.google_sub = google_sub
        self.session.commit()
        self.session.refresh(user)
        return user
