from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.resource import Resource

# Create a router to group our endpoints
router = APIRouter()

@router.get("/")
def get_all_resources(db: Session = Depends(get_db)):
    """Fetch all resources from the database"""
    resources = db.query(Resource).all()
    return resources

@router.post("/")
def create_resource(name: str, description: str, db: Session = Depends(get_db)):
    """Create a new resource"""
    new_resource = Resource(name=name, description=description)
    db.add(new_resource)
    db.commit()      # Save to database
    db.refresh(new_resource) # Get the updated object with ID
    return new_resource
