import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship

from app.db.database import Base


def now_utc():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username   = Column(String(50), unique=True, nullable=False, index=True)
    email      = Column(String(120), unique=True, nullable=False, index=True)
    hashed_pw  = Column(String, nullable=False)
    role       = Column(Enum("user", "admin", name="user_role"), default="user", nullable=False)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    tasks = relationship("Task", back_populates="owner", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"


class Task(Base):
    __tablename__ = "tasks"

    id          = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title       = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status      = Column(Enum("todo", "in_progress", "done", name="task_status"), default="todo")
    owner_id    = Column(String, ForeignKey("users.id"), nullable=False)
    created_at  = Column(DateTime(timezone=True), default=now_utc)
    updated_at  = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    owner = relationship("User", back_populates="tasks")

    def __repr__(self):
        return f"<Task {self.title!r} [{self.status}]>"
