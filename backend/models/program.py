"""Program model — stores NGO programs/events."""
from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime, timezone
from database import Base


class Program(Base):
    __tablename__ = "programs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    date = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
