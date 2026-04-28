from sqlalchemy import Column, Integer, String, ForeignKey, Enum as SQLAlchemyEnum, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from database import Base


class RequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class VolunteerRequest(Base):
    __tablename__ = "volunteer_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    profession = Column(String, nullable=True)
    status = Column(SQLAlchemyEnum(RequestStatus), default=RequestStatus.pending)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="volunteer_requests")
