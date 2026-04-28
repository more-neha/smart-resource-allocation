import os
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user import User, UserRole
from models.volunteer import Volunteer
from models.volunteer_request import VolunteerRequest, RequestStatus
from schemas import (
    VolunteerRegister, UserSignup, UserLogin, UserGoogleLogin,
    UserProfileComplete, VolunteerRequestCreate, VolunteerRequestAction,
)
from security import hash_password, verify_password, create_access_token
from auth_dependencies import get_current_user, require_admin

SUPER_ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL", "sra.platformtech@gmail.com")

router = APIRouter()

@router.post("/register-volunteer", status_code=status.HTTP_201_CREATED)
def register_volunteer(data: VolunteerRegister, db: Session = Depends(get_db)):
    """
    Registers a new user and automatically creates their volunteer profile.
    Properly links the `Users` and `Volunteers` tables in the database.
    """
    # 1. Ensure the email isn't already taken
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Create the base User record
    new_user = User(
        name=data.name,
        email=data.email,
        password=hash_password("defaultpassword"),
        role=UserRole.volunteer
    )
    db.add(new_user)
    db.commit()      # Save to generate user ID
    db.refresh(new_user) 

    new_volunteer = Volunteer(
        user_id=new_user.id,
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        address=data.address,
        profession=data.profession,
    )
    db.add(new_volunteer)
    db.commit()
    db.refresh(new_volunteer)

    return {
        "message": "Volunteer registered successfully",
        "data": {
            "user_id": new_user.id,
            "volunteer_id": new_volunteer.id
        }
    }


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(data: UserSignup, db: Session = Depends(get_db)):
    """Create a volunteer account with a hashed password."""
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        name=data.name,
        email=data.email,
        password=hash_password(data.password),
        role=UserRole.volunteer,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    volunteer_profile = Volunteer(
        user_id=new_user.id,
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        address=data.address,
        profession=data.profession,
    )
    db.add(volunteer_profile)
    db.commit()
    db.refresh(volunteer_profile)

    return {
        "message": "Signup successful",
        "data": {
            "user_id": new_user.id,
            "email": new_user.email,
            "role": new_user.role,
            "volunteer_id": volunteer_profile.id,
        },
    }


@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Validate credentials and return a JWT access token with the user role."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
    }


@router.get("/me")
def read_me(current_user: User = Depends(get_current_user)):
    """Protected endpoint: return details of the logged-in user."""
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value,
    }


@router.get("/volunteers")
def get_volunteers(db: Session = Depends(get_db)):
    """
    Fetch all active volunteers, resolving their generic user data (name/email).
    """
    volunteers = db.query(Volunteer).all()
    
    response = []
    for v in volunteers:
        response.append({
            "volunteer_id": v.id,
            "name": v.user.name if v.user else "Unknown",
            "email": v.user.email if v.user else "Unknown",
            "first_name": v.first_name,
            "last_name": v.last_name,
            "phone": v.phone,
            "address": v.address,
            "profession": v.profession
        })

    return response


@router.post("/google-login")
def google_login(data: UserGoogleLogin, db: Session = Depends(get_db)):
    """Handle Google login — creates user if new, assigns role, returns JWT + status."""
    user = db.query(User).filter(User.email == data.email).first()

    new_user_flag = False
    volunteer_request_status = None

    if not user:
        # Determine role based on email
        if data.email == SUPER_ADMIN_EMAIL:
            role = UserRole.super_admin
        else:
            role = UserRole.user

        user = User(
            name=data.name,
            email=data.email,
            password=hash_password("google-auth-placeholder"),
            role=role,
            profile_complete=(role == UserRole.super_admin),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        new_user_flag = True
    else:
        # Upgrade to super_admin if email matches
        if data.email == SUPER_ADMIN_EMAIL and user.role != UserRole.super_admin:
            user.role = UserRole.super_admin
            user.profile_complete = True
            db.commit()
            db.refresh(user)

    # Check volunteer request status if role is "user"
    if user.role == UserRole.user:
        vr = (
            db.query(VolunteerRequest)
            .filter(VolunteerRequest.user_id == user.id)
            .order_by(VolunteerRequest.created_at.desc())
            .first()
        )
        if vr:
            volunteer_request_status = vr.status.value

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
        "new_user": new_user_flag,
        "volunteer_request_status": volunteer_request_status,
        "profile_complete": user.profile_complete,
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
    }


@router.post("/complete-profile")
def complete_profile(
    data: UserProfileComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update volunteer profile details — authenticated users can only update their own profile."""
    # Security: Users can only update their own profile
    if data.email != current_user.email:
        raise HTTPException(status_code=403, detail="Cannot modify another user's profile")

    user = current_user

    volunteer = db.query(Volunteer).filter(Volunteer.user_id == user.id).first()
    if not volunteer:
        volunteer = Volunteer(user_id=user.id)
        db.add(volunteer)

    volunteer.first_name = data.first_name
    volunteer.last_name = data.last_name
    volunteer.phone = data.phone
    volunteer.address = data.address
    volunteer.profession = data.profession
    
    user.profile_complete = True
    db.commit()
    
    return {"message": "Profile completed successfully"}


# --- Volunteer Request Flow ---

@router.post("/volunteer-request", status_code=status.HTTP_201_CREATED)
def submit_volunteer_request(
    data: VolunteerRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a volunteer application for admin review."""
    # Check if user already has a pending request
    existing = (
        db.query(VolunteerRequest)
        .filter(
            VolunteerRequest.user_id == current_user.id,
            VolunteerRequest.status == RequestStatus.pending,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending application.")

    # Check if already a volunteer
    if current_user.role == UserRole.volunteer:
        raise HTTPException(status_code=400, detail="You are already a volunteer.")

    vr = VolunteerRequest(
        user_id=current_user.id,
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        address=data.address,
        profession=data.profession,
        status=RequestStatus.pending,
    )
    db.add(vr)
    db.commit()
    db.refresh(vr)

    return {"message": "Application submitted successfully", "request_id": vr.id}


@router.get("/volunteer-request/status")
def get_my_volunteer_request_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's latest volunteer request status."""
    vr = (
        db.query(VolunteerRequest)
        .filter(VolunteerRequest.user_id == current_user.id)
        .order_by(VolunteerRequest.created_at.desc())
        .first()
    )
    if not vr:
        return {"status": None}
    return {"status": vr.status.value, "request_id": vr.id, "created_at": str(vr.created_at)}


@router.get("/volunteer-requests/pending")
def get_pending_requests(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: list all pending volunteer requests."""
    requests = (
        db.query(VolunteerRequest)
        .filter(VolunteerRequest.status == RequestStatus.pending)
        .all()
    )
    result = []
    for vr in requests:
        result.append({
            "id": vr.id,
            "user_id": vr.user_id,
            "name": vr.user.name if vr.user else "Unknown",
            "email": vr.user.email if vr.user else "Unknown",
            "first_name": vr.first_name,
            "last_name": vr.last_name,
            "phone": vr.phone,
            "address": vr.address,
            "profession": vr.profession,
            "status": vr.status.value,
            "created_at": str(vr.created_at),
        })
    return result


@router.get("/volunteer-requests/all")
def get_all_requests(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: list all volunteer requests."""
    requests = db.query(VolunteerRequest).order_by(VolunteerRequest.created_at.desc()).all()
    result = []
    for vr in requests:
        result.append({
            "id": vr.id,
            "user_id": vr.user_id,
            "name": vr.user.name if vr.user else "Unknown",
            "email": vr.user.email if vr.user else "Unknown",
            "first_name": vr.first_name,
            "last_name": vr.last_name,
            "phone": vr.phone,
            "address": vr.address,
            "profession": vr.profession,
            "status": vr.status.value,
            "created_at": str(vr.created_at),
        })
    return result


@router.post("/volunteer-requests/action")
def process_volunteer_request(
    data: VolunteerRequestAction,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: approve or reject a volunteer request."""
    vr = db.query(VolunteerRequest).filter(VolunteerRequest.id == data.request_id).first()
    if not vr:
        raise HTTPException(status_code=404, detail="Request not found.")

    if vr.status != RequestStatus.pending:
        raise HTTPException(status_code=400, detail=f"Request already {vr.status.value}.")

    user = db.query(User).filter(User.id == vr.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if data.action == "approved":
        vr.status = RequestStatus.approved

        # Upgrade user role
        user.role = UserRole.volunteer
        user.profile_complete = True

        # Create volunteer profile
        volunteer = Volunteer(
            user_id=user.id,
            first_name=vr.first_name,
            last_name=vr.last_name,
            phone=vr.phone,
            address=vr.address,
            profession=vr.profession,
        )
        db.add(volunteer)
        db.commit()
        return {"message": f"Volunteer request for {user.name} approved."}

    else:
        vr.status = RequestStatus.rejected
        db.commit()
        return {"message": f"Volunteer request for {user.name} rejected."}


@router.post("/remove-volunteer/{volunteer_id}")
def remove_volunteer(
    volunteer_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin: Remove a volunteer by volunteer_id, downgrading them back to a normal user."""
    volunteer = db.query(Volunteer).filter(Volunteer.id == volunteer_id).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found.")

    user = db.query(User).filter(User.id == volunteer.user_id).first()
    if user:
        user.role = UserRole.user
        user.profile_complete = False

    # Mark assigned tasks as unassigned/pending if applicable
    # This requires importing Task or modifying the logic but we can do a raw update
    from sqlalchemy import text
    db.execute(
        text("UPDATE tasks SET status = 'pending', volunteer_id = NULL WHERE volunteer_id = :vid"),
        {"vid": volunteer_id}
    )
        
    db.delete(volunteer)
    db.commit()

    return {"message": "Volunteer removed successfully"}
