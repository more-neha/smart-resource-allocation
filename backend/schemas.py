from typing import Literal, Optional
from pydantic import BaseModel, Field

# Pydantic schema for data validation when receiving API requests
class ProblemCreate(BaseModel):
    first_name: str = Field(..., description="Reporter's first name")
    last_name: str = Field(..., description="Reporter's last name")
    phone: str = Field(..., description="Reporter's phone number")
    problem_type: str = Field(..., description="Type of emergency, e.g., 'flood', 'fire'")
    description: str
    location: str = Field(..., description="Location text or coordinates as 'latitude,longitude'")
    severity: int = Field(..., ge=1, le=5, description="Scale of 1-5")
    people_affected: int

    class Config:
        # Example that will show up in the FastAPI auto-generated docs
        json_schema_extra = {
            "example": {
                "first_name": "Rahul",
                "last_name": "Sharma",
                "phone": "+919876543210",
                "problem_type": "flood",
                "description": "Heavy rain caused waterlogging in residential area",
                "location": "18.5204,73.8567",
                "severity": 4,
                "people_affected": 120
            }
        }

class VolunteerRegister(BaseModel):
    first_name: str
    last_name: str
    phone: str
    address: str
    profession: str

    class Config:
        json_schema_extra = {
            "example": {
                "first_name": "Jane",
                "last_name": "Doe",
                "phone": "+919876543210",
                "address": "Downtown District",
                "profession": "Doctor"
            }
        }


class UserSignup(BaseModel):
    name: str
    email: str
    password: str = Field(min_length=8, description="Minimum 8 characters")
    skills: str = Field(description="Comma separated list of skills")
    location: str = Field(description="Current city or area")
    availability: str = Field(description="When the volunteer is available")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Smith",
                "email": "john.smith@example.com",
                "password": "StrongPass123!",
                "role": "volunteer"
            }
        }


class UserLogin(BaseModel):
    email: str
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "john.smith@example.com",
                "password": "StrongPass123!"
            }
        }

class TaskAssign(BaseModel):
    problem_id: int
    volunteer_id: int

    class Config:
        json_schema_extra = {
            "example": {
                "problem_id": 1,
                "volunteer_id": 1
            }
        }


class TaskStatusUpdate(BaseModel):
    task_id: int
    status: Literal["accepted", "active", "declined", "completed"]
    notes: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "task_id": 1,
                "status": "active",
                "notes": "Reached the site and started work"
            }
        }


class UserGoogleLogin(BaseModel):
    email: str
    name: str

class UserProfileComplete(BaseModel):
    email: str
    first_name: str
    last_name: str
    phone: str
    address: str
    profession: str


# --- New schemas for volunteer requests ---
class VolunteerRequestCreate(BaseModel):
    first_name: str
    last_name: str
    phone: str
    address: str
    profession: str

class VolunteerRequestAction(BaseModel):
    request_id: int
    action: Literal["approved", "rejected"]


# --- Chat schemas ---
class ChatMessageCreate(BaseModel):
    receiver_id: int
    message: str


# --- Admin management schemas ---
class AdminManage(BaseModel):
    email: str


class IncidentDecision(BaseModel):
    action: Literal["verify", "reject"]
    notes: Optional[str] = None
    auto_notify: bool = True
    max_volunteers: int = Field(default=3, ge=1, le=10)


class IncidentAIReviewResponse(BaseModel):
    recommended_action: Literal["verify", "reject"]
    confidence: float
    summary: str
