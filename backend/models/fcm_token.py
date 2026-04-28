"""FCM Token model — stores Firebase Cloud Messaging device tokens."""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime, timezone
from database import Base


class FCMToken(Base):
    __tablename__ = "fcm_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
