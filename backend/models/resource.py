from sqlalchemy import Column, Integer, String, Boolean
from database import Base

# This defines our 'resources' table in the database
class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, index=True)
    is_allocated = Column(Boolean, default=False)
