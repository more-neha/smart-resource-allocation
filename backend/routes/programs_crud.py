"""Programs CRUD API — Create, Read, Update, Delete NGO programs."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.program import Program
from models.user import User
from auth_dependencies import get_current_user, require_admin
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class ProgramCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    date: Optional[str] = None
    image_url: Optional[str] = None


class ProgramUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    date: Optional[str] = None
    image_url: Optional[str] = None


@router.post("/programs", status_code=status.HTTP_201_CREATED)
def create_program(
    data: ProgramCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: Create a new program."""
    program = Program(
        title=data.title,
        description=data.description,
        location=data.location,
        date=data.date,
        image_url=data.image_url,
        created_by=current_user.id,
    )
    db.add(program)
    db.commit()
    db.refresh(program)

    return {
        "message": "Program created successfully",
        "program": {
            "id": program.id,
            "title": program.title,
            "description": program.description,
            "location": program.location,
            "date": program.date,
            "image_url": program.image_url,
            "created_at": str(program.created_at),
        },
    }


@router.get("/programs")
def get_all_programs(db: Session = Depends(get_db)):
    """Public: Fetch all programs."""
    programs = db.query(Program).order_by(Program.created_at.desc()).all()
    return {
        "count": len(programs),
        "programs": [
            {
                "id": p.id,
                "title": p.title,
                "description": p.description,
                "location": p.location,
                "date": p.date,
                "image_url": p.image_url,
                "created_at": str(p.created_at),
            }
            for p in programs
        ],
    }


@router.put("/programs/{program_id}")
def update_program(
    program_id: int,
    data: ProgramUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: Update a program."""
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    if data.title is not None:
        program.title = data.title
    if data.description is not None:
        program.description = data.description
    if data.location is not None:
        program.location = data.location
    if data.date is not None:
        program.date = data.date
    if data.image_url is not None:
        program.image_url = data.image_url

    db.commit()
    db.refresh(program)

    return {
        "message": "Program updated successfully",
        "program": {
            "id": program.id,
            "title": program.title,
            "description": program.description,
            "location": program.location,
            "date": program.date,
            "image_url": program.image_url,
        },
    }


@router.delete("/programs/{program_id}")
def delete_program(
    program_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: Delete a program."""
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    db.delete(program)
    db.commit()

    return {"message": "Program deleted successfully"}
