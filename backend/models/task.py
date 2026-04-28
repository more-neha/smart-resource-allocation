from sqlalchemy import Column, Integer, ForeignKey, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from sqlalchemy import String, DateTime, Text
from datetime import datetime, timezone
import enum
from database import Base

class TaskStatus(str, enum.Enum):
    pending = "pending"
    assigned = "assigned"
    active = "active"
    accepted = "accepted"
    declined = "declined"
    completed = "completed"

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id")) # Which problem this task belongs to
    
    # Nullable=True because a task might be created before a volunteer accepts it
    volunteer_id = Column(Integer, ForeignKey("volunteers.id"), nullable=True) 
    
    status = Column(SQLAlchemyEnum(TaskStatus), default=TaskStatus.pending)
    assigned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    confirmed_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    last_notification_provider = Column(String, nullable=True)
    last_notification_status = Column(String, nullable=True)
    last_notification_error = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_solution = Column(Text, nullable=True)
    ai_steps = Column(Text, nullable=True)  # JSON array stored as text
    proof_image_url = Column(String, nullable=True) # "After" proof image
    
    # Relationships
    problem = relationship("Problem", back_populates="tasks")
    volunteer = relationship("Volunteer", back_populates="tasks")
    history_entries = relationship("TaskHistory", back_populates="task")


class TaskHistory(Base):
    __tablename__ = "task_history"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False, index=True)
    old_status = Column(String, nullable=True)
    new_status = Column(String, nullable=False)
    changed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    changed_via = Column(String, default="api")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    task = relationship("Task", back_populates="history_entries")
