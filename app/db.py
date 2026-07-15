from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

class Base(DeclarativeBase):
    pass

engine = create_engine("sqlite:///./tracker.db", echo=False)
SessionLocal = sessionmaker(bind=engine,autoflush=False,expire_on_commit=False)

