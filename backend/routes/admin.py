from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user import User, UserRole
from schemas import AdminManage
from auth_dependencies import require_super_admin, require_admin

router = APIRouter()


@router.get("/admins")
def list_admins(
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super admin: list all admin and super_admin users."""
    admins = (
        db.query(User)
        .filter(User.role.in_([UserRole.admin, UserRole.super_admin]))
        .all()
    )
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role.value,
        }
        for u in admins
    ]


@router.post("/admins/add")
def add_admin(
    data: AdminManage,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super admin: promote a user to admin role."""
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user:
        # Pre-create the admin account. When they log in via Google, they'll match this email.
        from security import hash_password
        user = User(
            email=data.email,
            name=data.email.split("@")[0], # Temporary name until they log in
            password=hash_password("google-auth-placeholder"),
            role=UserRole.admin,
            profile_complete=True
        )
        db.add(user)
        db.commit()
        return {"message": f"Admin invite created for {data.email}. They can now log in."}

    if user.role == UserRole.super_admin:
        raise HTTPException(status_code=400, detail="Cannot modify super admin.")

    if user.role == UserRole.admin:
        raise HTTPException(status_code=400, detail="User is already an admin.")

    user.role = UserRole.admin
    user.profile_complete = True
    db.commit()
    return {"message": f"{user.name} ({user.email}) has been promoted to admin."}


@router.post("/admins/remove")
def remove_admin(
    data: AdminManage,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Super admin: demote an admin back to user role."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.role == UserRole.super_admin:
        raise HTTPException(status_code=400, detail="Cannot modify super admin.")

    if user.role != UserRole.admin:
        raise HTTPException(status_code=400, detail="User is not an admin.")

    user.role = UserRole.user
    db.commit()
    return {"message": f"{user.name} ({user.email}) has been removed as admin."}
