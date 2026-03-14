from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.database import get_db
from app.db.models import User
from app.middleware.deps import get_current_user
from app.schemas.user import UserOut
from app.core.auth.security import hash_password, verify_password


router = APIRouter()


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/me/change-password", status_code=204)
def change_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_pw):
        raise HTTPException(status_code=400, detail="current password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=422, detail="new password must be at least 8 characters")

    current_user.hashed_pw = hash_password(payload.new_password)
    db.commit()
