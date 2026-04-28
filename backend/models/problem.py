from sqlalchemy import Column, Integer, String, Float, Text, Enum as SQLAlchemyEnum, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from database import Base

class ProblemStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    completed = "completed"

class Problem(Base):
    __tablename__ = "problems"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    type = Column(String, index=True)  # E.g., 'flood', 'medical emergency', 'food shortage'
    description = Column(Text)
    latitude = Column(Float)   # Storing coordinates separately makes map calculations easier
    longitude = Column(Float)
    severity = Column(Integer) # Scale of 1-5
    people_affected = Column(Integer)
    status = Column(SQLAlchemyEnum(ProblemStatus), default=ProblemStatus.pending)
    image_url = Column(String, nullable=True)  # Cloudinary image URL
    location_text = Column(String, nullable=True)  # Free-text location
    urgency_score = Column(Float, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    verification_status = Column(String, default="pending")  # pending | verified | rejected
    ai_confidence = Column(Float, nullable=True)
    ai_summary = Column(Text, nullable=True)
    reviewed_by_user_id = Column(Integer, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)
    
    # One-to-Many relationship: A problem can have many tasks required to solve it
    tasks = relationship("Task", back_populates="problem")
