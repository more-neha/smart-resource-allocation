import os
import re
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models.problem import Problem, ProblemStatus
from models.volunteer import Volunteer
from models.user import User
from models.task import Task, TaskStatus, TaskHistory
from cloudinary_config import upload_image, ALLOWED_IMAGE_TYPES
from auth_dependencies import require_admin
from schemas import IncidentDecision
from services.incident_verification_service import analyze_incident
from services.notification_service import send_assignment_notification
from services.urgency_service import recalculate_problem_urgency

router = APIRouter()

_GEOCODE_CACHE: dict[str, tuple[float, float]] = {}
_KNOWN_LOCATIONS = {
    "pimpri": (18.6298, 73.7997),
    "chinchwad": (18.6270, 73.7813),
    "pimple saudagar": (18.5944, 73.7900),
    "kalewadi": (18.6015, 73.7810),
    "rahatani": (18.6038, 73.7866),
    "pune": (18.5204, 73.8567),
}


def _parse_location_coordinates(raw_location: str | None) -> tuple[float, float]:
    if not raw_location:
        return 0.0, 0.0

    text = str(raw_location).strip()

    try:
        lat_str, lon_str = [part.strip() for part in text.split(",", 1)]
        lat = float(lat_str)
        lon = float(lon_str)
        if -90 <= lat <= 90 and -180 <= lon <= 180:
            return lat, lon
    except (ValueError, TypeError):
        pass

    matches = re.findall(r"[-+]?\d{1,3}(?:\.\d+)?", text)
    if len(matches) >= 2:
        try:
            lat = float(matches[0])
            lon = float(matches[1])
            if -90 <= lat <= 90 and -180 <= lon <= 180:
                return lat, lon
        except ValueError:
            pass

    lowered = text.lower()
    for place, coords in _KNOWN_LOCATIONS.items():
        if place in lowered:
            return coords

    if lowered in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[lowered]

    try:
        encoded = urllib.parse.quote(text)
        request = urllib.request.Request(
            url=f"https://nominatim.openstreetmap.org/search?q={encoded}&format=json&limit=1",
            headers={"User-Agent": "SmartAid/1.0 (admin-incident-heatmap)"},
        )
        with urllib.request.urlopen(request, timeout=4) as response:
            payload = json.loads(response.read().decode("utf-8"))
            if payload:
                lat = float(payload[0].get("lat"))
                lon = float(payload[0].get("lon"))
                if -90 <= lat <= 90 and -180 <= lon <= 180:
                    _GEOCODE_CACHE[lowered] = (lat, lon)
                    return lat, lon
    except Exception:
        pass

    return 0.0, 0.0


def _auto_assign_verified_incident(problem: Problem, db: Session, background_tasks: BackgroundTasks) -> dict:
    volunteers = db.query(Volunteer).all()
    nearby = _suggest_nearby_volunteers(problem=problem, volunteers=volunteers, max_count=1)

    if not nearby:
        return {"assigned": False, "reason": "No volunteers available"}

    volunteer = nearby[0]

    task = Task(
        problem_id=problem.id,
        volunteer_id=volunteer.id,
        status=TaskStatus.assigned,
        assigned_at=datetime.now(timezone.utc),
        notes="Auto-assigned by AI incident verification",
    )
    db.add(task)
    db.flush()

    message = (
        f"SmartAid Task #{task.id}: New verified incident '{problem.type}' at {problem.location_text or 'unknown location'}. "
        f"Severity {problem.severity}/5, affected {problem.people_affected}. Reply CONFIRM {task.id} to accept."
    )
    notification_result = send_assignment_notification(volunteer.phone or "", message)

    task.last_notification_provider = notification_result.provider
    task.last_notification_status = "sent" if notification_result.success else "failed"
    task.last_notification_error = notification_result.error

    db.add(
        TaskHistory(
            task_id=task.id,
            old_status=None,
            new_status=TaskStatus.assigned.value,
            changed_by_user_id=None,
            changed_via="ai_auto_assign",
            notes="Task auto-created by AI verification flow",
        )
    )

    return {
        "assigned": True,
        "task_id": task.id,
        "volunteer_id": volunteer.id,
        "volunteer_name": volunteer.user.name if volunteer.user else "Unknown",
        "notification": {
            "provider": notification_result.provider,
            "status": "sent" if notification_result.success else "failed",
            "error": notification_result.error,
        },
    }

@router.post("/report-problem", status_code=status.HTTP_201_CREATED)
async def report_problem(
    first_name: str = Form(...),
    last_name: str = Form(...),
    phone: str = Form(...),
    problem_type: str = Form(...),
    description: str = Form(...),
    location: str = Form(...),
    place: Optional[str] = Form(None),
    severity: int = Form(..., ge=1, le=5),
    people_affected: int = Form(...),
    image: Optional[UploadFile] = File(None),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
):
    """
    Public endpoint to report a new problem with optional image upload.
    Image is uploaded to Cloudinary and the URL is stored in the database.
    """
    # Parse location
    location_text = place.strip() if place and place.strip() else location
    latitude, longitude = _parse_location_coordinates(location)

    # Handle image upload
    image_url = None
    if image and image.filename:
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image type: {image.content_type}. Allowed: jpeg, png, gif, webp",
            )
        try:
            image_url = upload_image(image)
        except Exception as e:
            # Don't fail the whole request if image upload fails
            print(f"Cloudinary upload failed: {e}")

    new_problem = Problem(
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        type=problem_type,
        description=description,
        latitude=latitude,
        longitude=longitude,
        location_text=location_text,
        severity=severity,
        people_affected=people_affected,
        status=ProblemStatus.pending,
        verification_status="pending",
        image_url=image_url,
    )
    
    db.add(new_problem)
    db.commit()
    db.refresh(new_problem)

    ai_result = analyze_incident(new_problem)
    new_problem.ai_confidence = ai_result["confidence"]
    new_problem.ai_summary = ai_result["summary"]
    new_problem.reviewed_at = datetime.now(timezone.utc)
    new_problem.review_notes = "Auto-reviewed by AI on incident submission"

    auto_assignment = None
    if ai_result["recommended_action"] == "verify":
        new_problem.verification_status = "verified"
        new_problem.status = ProblemStatus.pending
        auto_assignment = _auto_assign_verified_incident(problem=new_problem, db=db, background_tasks=background_tasks)
    else:
        new_problem.verification_status = "rejected"
        new_problem.status = ProblemStatus.pending

    recalculate_problem_urgency(db=db, problem=new_problem)
    db.commit()
    db.refresh(new_problem)
    
    return {
        "message": "Problem reported successfully",
        "data": {
            "problem_id": new_problem.id,
            "status": new_problem.status,
            "verification_status": new_problem.verification_status,
            "ai_decision": ai_result["recommended_action"],
            "ai_confidence": ai_result["confidence"],
            "ai_summary": ai_result["summary"],
            "auto_assignment": auto_assignment,
            "type": new_problem.type,
            "location": {
                "latitude": new_problem.latitude,
                "longitude": new_problem.longitude,
                "text": new_problem.location_text,
            },
            "severity": new_problem.severity,
            "image_url": new_problem.image_url,
        }
    }


@router.get("/problems")
def get_all_problems(db: Session = Depends(get_db)):
    """
    Fetch all problems and sort them by urgency.
    Urgency gives heavy weight to severity, but also accounts for people affected.
    """
    # 1. Fetch all problems from the database
    problems = db.query(Problem).all()

    # 2. Backfill coordinates for legacy records and recalculate urgency.
    for problem in problems:
        if (problem.latitude == 0.0 and problem.longitude == 0.0) and problem.location_text:
            parsed_lat, parsed_lon = _parse_location_coordinates(problem.location_text)
            if parsed_lat != 0.0 or parsed_lon != 0.0:
                problem.latitude = parsed_lat
                problem.longitude = parsed_lon
        recalculate_problem_urgency(db=db, problem=problem)
    db.commit()

    # 3. Sort problems in-memory based on our urgency formula (highest urgency first)
    problems.sort(key=lambda p: p.urgency_score or 0, reverse=True)

    # 4. Format the output into a clean, structured JSON format
    structured_response = []
    for p in problems:
        proof_image_url = None
        if p.status == ProblemStatus.completed:
            from models.task import Task, TaskStatus
            task = db.query(Task).filter(Task.problem_id == p.id, Task.status == TaskStatus.completed).first()
            if task:
                proof_image_url = task.proof_image_url

        structured_response.append({
            "id": p.id,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "phone": p.phone,
            "type": p.type,
            "description": p.description,
            "location": {
                "latitude": p.latitude,
                "longitude": p.longitude,
                "text": p.location_text,
            },
            "severity": p.severity,
            "people_affected": p.people_affected,
            "status": p.status,
            "verification_status": p.verification_status,
            "ai_confidence": p.ai_confidence,
            "ai_summary": p.ai_summary,
            "review_notes": p.review_notes,
            "image_url": p.image_url,
            "proof_image_url": proof_image_url,
            "urgency_score": p.urgency_score
        })

    return {
        "count": len(structured_response),
        "problems": structured_response
    }


@router.get("/problems/{problem_id}")
def get_problem(problem_id: int, db: Session = Depends(get_db)):
    """Get a single problem by ID."""
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return {
        "id": problem.id,
        "first_name": problem.first_name,
        "last_name": problem.last_name,
        "phone": problem.phone,
        "type": problem.type,
        "description": problem.description,
        "location": {
            "latitude": problem.latitude,
            "longitude": problem.longitude,
            "text": problem.location_text,
        },
        "severity": problem.severity,
        "people_affected": problem.people_affected,
        "status": problem.status,
        "verification_status": problem.verification_status,
        "ai_confidence": problem.ai_confidence,
        "ai_summary": problem.ai_summary,
        "review_notes": problem.review_notes,
        "image_url": problem.image_url,
    }


def _suggest_nearby_volunteers(problem: Problem, volunteers: list[Volunteer], max_count: int) -> list[Volunteer]:
    problem_type = (problem.type or "").lower()
    problem_location = (problem.location_text or "").lower()

    scored = []
    for volunteer in volunteers:
        score = 0
        v_profession = (volunteer.profession or "").lower()
        v_address = (volunteer.address or "").lower()

        if problem_type and problem_type in v_profession:
            score += 40
        for keyword in problem_type.split():
            if keyword and keyword in v_profession:
                score += 10

        if problem_location and problem_location in v_address:
            score += 30
        elif v_address and v_address in problem_location:
            score += 20

        scored.append((score, volunteer))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [item[1] for item in scored[:max_count]]


@router.get("/admin/incidents/pending")
def get_pending_incidents_for_admin(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    problems = (
        db.query(Problem)
        .filter(Problem.verification_status == "pending")
        .order_by(Problem.id.desc())
        .all()
    )

    return {
        "count": len(problems),
        "incidents": [
            {
                "id": p.id,
                "type": p.type,
                "description": p.description,
                "location_text": p.location_text,
                "severity": p.severity,
                "people_affected": p.people_affected,
                "verification_status": p.verification_status,
                "ai_confidence": p.ai_confidence,
                "ai_summary": p.ai_summary,
            }
            for p in problems
        ],
    }


@router.post("/admin/incidents/{problem_id}/ai-review")
def ai_review_incident(
    problem_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    result = analyze_incident(problem)
    problem.ai_confidence = result["confidence"]
    problem.ai_summary = result["summary"]
    db.commit()

    return {
        "problem_id": problem_id,
        "recommended_action": result["recommended_action"],
        "confidence": result["confidence"],
        "summary": result["summary"],
    }


@router.post("/admin/incidents/{problem_id}/decision")
def decide_incident(
    problem_id: int,
    payload: IncidentDecision,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    result = analyze_incident(problem)
    problem.ai_confidence = result["confidence"]
    problem.ai_summary = result["summary"]
    problem.reviewed_by_user_id = current_user.id
    problem.reviewed_at = datetime.now(timezone.utc)
    problem.review_notes = payload.notes

    notified = []
    if payload.action == "verify":
        problem.verification_status = "verified"
        problem.status = ProblemStatus.pending

        if payload.auto_notify:
            volunteers = db.query(Volunteer).all()
            nearby = _suggest_nearby_volunteers(problem=problem, volunteers=volunteers, max_count=payload.max_volunteers)
            for volunteer in nearby:
                message = (
                    f"SmartAid Alert: Verified incident #{problem.id} ({problem.type}) at {problem.location_text or 'unknown location'}. "
                    f"Severity {problem.severity}/5, affected {problem.people_affected}. Reply to NGO admin if available."
                )
                notification_result = send_assignment_notification(volunteer.phone or "", message)
                notified.append(
                    {
                        "volunteer_id": volunteer.id,
                        "name": volunteer.user.name if volunteer.user else "Unknown",
                        "phone": volunteer.phone,
                        "status": "sent" if notification_result.success else "failed",
                        "provider": notification_result.provider,
                        "error": notification_result.error,
                    }
                )
    else:
        problem.verification_status = "rejected"

    recalculate_problem_urgency(db=db, problem=problem)
    db.commit()

    return {
        "message": f"Incident {payload.action}d successfully",
        "problem_id": problem.id,
        "verification_status": problem.verification_status,
        "ai_confidence": problem.ai_confidence,
        "notified_volunteers": notified,
    }


@router.delete("/problems/{problem_id}")
def delete_problem(
    problem_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: Delete a reported problem and associated tasks."""
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Delete related tasks first due to foreign keys
    tasks = db.query(Task).filter(Task.problem_id == problem_id).all()
    for task in tasks:
        db.query(TaskHistory).filter(TaskHistory.task_id == task.id).delete()
        db.delete(task)
        
    db.delete(problem)
    db.commit()

    return {"message": "Problem deleted successfully"}
