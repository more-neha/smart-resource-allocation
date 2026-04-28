from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Volunteer(Base):
    __tablename__ = "volunteers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id")) # Links to User table
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    profession = Column(String, nullable=True)
    rating = Column(Integer, default=5) # 1-5 scale
    tasks_completed = Column(Integer, default=0)
    avg_response_time = Column(Integer, default=0) # in minutes
    
    # Back direction of the 1-to-1 relationship to User
    user = relationship("User", back_populates="volunteer_profile")
    
    # One-to-Many relationship: A volunteer can take on multiple tasks
    tasks = relationship("Task", back_populates="volunteer")
