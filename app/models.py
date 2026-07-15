import datetime as dt
from sqlalchemy import String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base, engine

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, server_default = func.now())
    tasks: Mapped[list["Task"]] = relationship(back_populates = "owner")

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key = True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text())
    status: Mapped[str] = mapped_column(String(20), default="todo", index=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, server_default = func.now())
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index = True)
    owner: Mapped["User"] = relationship(back_populates = "tasks")

Base.metadata.create_all(bind=engine)