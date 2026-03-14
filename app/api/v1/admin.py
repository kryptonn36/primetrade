from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User, Task
from app.middleware.deps import require_admin
from app.schemas.user import UserOut
from app.schemas.task import TaskOut


router = APIRouter()


@router.get("/users", response_model=List[UserOut])
def list_all_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(User).all()


@router.patch("/users/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="user not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="cannot deactivate yourself")
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/promote", response_model=UserOut)
def promote_user(user_id: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="user not found")
    user.role = "admin"
    db.commit()
    db.refresh(user)
    return user


@router.get("/tasks", response_model=List[TaskOut])
def list_all_tasks(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(Task).all()
