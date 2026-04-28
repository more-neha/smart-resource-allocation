import os
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
from models.user import User, UserRole
from security import decode_access_token

SUPER_ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL", "sra.platformtech@gmail.com")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
    except ValueError:
        raise credentials_exception

    email = payload.get("sub")
    if not email:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise credentials_exception

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.admin, UserRole.super_admin):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user


def require_volunteer(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.volunteer:
        raise HTTPException(status_code=403, detail="Volunteer access required")
    return current_user
