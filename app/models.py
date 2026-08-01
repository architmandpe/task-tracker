import datetime as dt
from sqlalchemy import String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    # Null for accounts created through Google - they have no password to check.
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Google's stable subject id. Preferred over email for lookup: a Google
    # account's email can change, its sub never does.
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
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
    priority: Mapped[str] = mapped_column(String(20), default="normal")
    due_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    recurrence: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Soft delete: set on delete, cleared on restore. The row keeps its id so an
    # undo brings back the same task rather than a copy of it.
    deleted_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True, index=True)

class AgentAction(Base):
    __tablename__ = "agent_actions"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(50))
    summary: Mapped[str] = mapped_column(Text())
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, server_default=func.now())
