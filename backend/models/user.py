from sqlalchemy import Column, Integer, String, Boolean, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
import enum
from database import Base

# Using Python Enums keeps your database inputs restricted to specific values
class UserRole(str, enum.Enum):
    user = "user"
    volunteer = "volunteer"
    admin = "admin"
    super_admin = "super_admin"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)  # Note: Passwords MUST be hashed in production (e.g., using Passlib/Bcrypt)
    role = Column(SQLAlchemyEnum(UserRole), default=UserRole.user)
    profile_complete = Column(Boolean, default=False)
    
    # One-to-One relationship to Volunteer Profile
    # Setting uselist=False enforces a 1-to-1 relationship on the SQLAlchemy side
    volunteer_profile = relationship("Volunteer", back_populates="user", uselist=False)
    
    # Relationship to volunteer requests
    volunteer_requests = relationship("VolunteerRequest", back_populates="user")
