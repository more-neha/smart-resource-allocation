import re
import json
from datetime import datetime, timezone

import os

from fastapi import APIRouter, Depends, status, HTTPException, Form, File, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from database import get_db
from models.task import Task, TaskStatus
from models.task import TaskHistory
from models.problem import Problem, ProblemStatus
from models.volunteer import Volunteer
from models.user import User
from schemas import TaskAssign, TaskStatusUpdate
from auth_dependencies import require_admin, require_volunteer
from services.notification_service import (
    send_assignment_notification,
    build_assignment_message,
    _normalize_phone as service_normalize_phone
)
from services.urgency_service import (
    recalculate_problem_urgency,
    recalculate_related_problems_for_area,
)
from services.gemini_service import generate_task_explanation
from routes.notifications import send_task_assignment_push

router = APIRouter()


def _status_value(value: TaskStatus | str | None) -> str | None:
    if value is None:
        return None
    return value.value if isinstance(value, TaskStatus) else str(value)


def _normalize_status(input_status: str) -> TaskStatus:
    normalized = input_status.strip().lower()
    if normalized == "accepted":
        return TaskStatus.active
    return TaskStatus(normalized)


# Local helper for webhook remains similar but can use service normalization
def _normalize_phone(phone: str | None) -> str:
    return service_normalize_phone(phone)


def _is_valid_transition(current: TaskStatus, target: TaskStatus) -> bool:
    allowed = {
        TaskStatus.pending: {TaskStatus.assigned, TaskStatus.active, TaskStatus.declined},
        TaskStatus.assigned: {TaskStatus.active, TaskStatus.declined},
        TaskStatus.accepted: {TaskStatus.active, TaskStatus.completed, TaskStatus.declined},
        TaskStatus.active: {TaskStatus.completed, TaskStatus.declined},
        TaskStatus.declined: {TaskStatus.pending},
        TaskStatus.completed: set(),
    }
    return target in allowed.get(current, set())


def _log_task_history(
    db: Session,
    task_id: int,
    old_status: str | None,
    new_status: str,
    changed_by_user_id: int | None,
    changed_via: str,
    notes: str | None = None,
) -> None:
    db.add(
        TaskHistory(
            task_id=task_id,
            old_status=old_status,
            new_status=new_status,
            changed_by_user_id=changed_by_user_id,
            changed_via=changed_via,
            notes=notes,
        )
    )


def _sync_problem_status_and_urgency(db: Session, task: Task) -> None:
    if not task.problem:
        return

    problem = task.problem
    if task.status in (TaskStatus.active, TaskStatus.accepted, TaskStatus.assigned):
        problem.status = ProblemStatus.active
    elif task.status == TaskStatus.completed:
        problem.status = ProblemStatus.completed
    elif task.status in (TaskStatus.pending, TaskStatus.declined):
        has_other_active = (
            db.query(Task)
            .filter(
                Task.problem_id == task.problem_id,
                Task.id != task.id,
                Task.status.in_([TaskStatus.active, TaskStatus.accepted]),
            )
            .first()
            is not None
        )
        problem.status = ProblemStatus.active if has_other_active else ProblemStatus.pending

    recalculate_problem_urgency(db=db, problem=problem)
    if task.status == TaskStatus.completed:
        recalculate_related_problems_for_area(db=db, source_problem=problem)


def _apply_task_status_update(
    db: Session,
    task: Task,
    target_status: TaskStatus,
    changed_by_user_id: int | None,
    changed_via: str,
    notes: str | None = None,
    proof_image_url: str | None = None,
) -> None:
    current_status = task.status
    if not _is_valid_transition(current=current_status, target=target_status):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition: {current_status.value} -> {target_status.value}",
        )

    task.status = target_status
    if target_status == TaskStatus.active:
        task.confirmed_at = datetime.now(timezone.utc)
    if target_status == TaskStatus.completed:
        task.completed_at = datetime.now(timezone.utc)
        if proof_image_url:
            task.proof_image_url = proof_image_url
            
        # Update volunteer performance metrics
        if task.volunteer:
            v = task.volunteer
            v.tasks_completed += 1
            
            # Calculate response time in minutes
            if task.assigned_at:
                diff_min = (task.completed_at - task.assigned_at).total_seconds() / 60
                # Moving average
                v.avg_response_time = int((v.avg_response_time * (v.tasks_completed - 1) + diff_min) / v.tasks_completed)
            
            # Auto-rating logic: Every 2 tasks completed improves rating by 0.5 up to 5
            # Starts at 5 by default, but let's say it can go up to 5.
            v.rating = min(5, 4.0 + (v.tasks_completed * 0.1))

    if notes:
        task.notes = notes

    _log_task_history(
        db=db,
        task_id=task.id,
        old_status=_status_value(current_status),
        new_status=_status_value(target_status),
        changed_by_user_id=changed_by_user_id,
        changed_via=changed_via,
        notes=notes,
    )
    _sync_problem_status_and_urgency(db=db, task=task)

@router.post("/assign-task", status_code=status.HTTP_201_CREATED)
def assign_task(
    data: TaskAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Assign a volunteer to a problem by creating an entry in the Tasks table.
    Generates AI explanation via Gemini and sends Firebase push notification.
    """
    # 1. Verify that the problem actually exists
    problem_exists = db.query(Problem).filter(Problem.id == data.problem_id).first()
    if not problem_exists:
        raise HTTPException(status_code=404, detail="Problem not found")

    # 2. Verify that the volunteer exists
    volunteer_exists = db.query(Volunteer).filter(Volunteer.id == data.volunteer_id).first()
    if not volunteer_exists:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    # 3. Generate AI task explanation via Gemini
    ai_explanation = generate_task_explanation(
        problem_type=problem_exists.type or "Unknown",
        description=problem_exists.description or "",
        severity=problem_exists.severity or 1,
        location=problem_exists.location_text or "Unknown",
        people_affected=problem_exists.people_affected or 0,
    )

    # 4. Create task assignment
    new_task = Task(
        problem_id=data.problem_id,
        volunteer_id=data.volunteer_id,
        status=TaskStatus.pending,
        assigned_at=datetime.now(timezone.utc),
        ai_summary=ai_explanation.get("summary", ""),
        ai_solution=ai_explanation.get("suggested_solution", ""),
        ai_steps=json.dumps(ai_explanation.get("steps", [])),
    )
    db.add(new_task)
    db.flush()

    # 5. Send mock/push notification
    assignment_message = build_assignment_message(
        task_id=new_task.id,
        problem_description=problem_exists.description,
        location=problem_exists.location_text or "Unknown location",
        contact_name=f"{problem_exists.first_name or ''} {problem_exists.last_name or ''}".strip() or "NGO Contact",
    )
    notification_result = send_assignment_notification(
        phone=volunteer_exists.phone or "",
        message=assignment_message,
    )

    new_task.last_notification_provider = os.getenv("NOTIFICATION_PROVIDER", "mock")
    new_task.last_notification_status = "sent" if notification_result.success else "failed"
    new_task.last_notification_error = notification_result.error

    _log_task_history(
        db=db,
        task_id=new_task.id,
        old_status=None,
        new_status=TaskStatus.pending.value,
        changed_by_user_id=current_user.id,
        changed_via="admin_assign",
        notes="Task assigned to volunteer",
    )

    _sync_problem_status_and_urgency(db=db, task=new_task)

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    # 6. Send Firebase push notification
    send_task_assignment_push(
        db=db,
        volunteer_id=data.volunteer_id,
        task_id=new_task.id,
        problem_type=problem_exists.type or "Task",
    )

    return {
        "message": "Task successfully created and assigned",
        "data": {
            "task_id": new_task.id,
            "problem_id": new_task.problem_id,
            "volunteer_id": new_task.volunteer_id,
            "status": new_task.status,
            "ai_explanation": ai_explanation,
            "notification": {
                "provider": notification_result.provider,
                "status": "sent" if notification_result.success else "failed",
                "error": notification_result.error,
            },
        }
    }

@router.get("/tasks")
def get_tasks(db: Session = Depends(get_db)):
    """
    Fetch all assignments. 
    Because of SQLAlchemy relationships, we can easily grab the deeply nested
    problem severity and volunteer's actual name!
    """
    tasks = db.query(Task).all()
    
    response = []
    for t in tasks:
        response.append({
            "task_id": t.id,
            "status": t.status,
            "assigned_at": t.assigned_at,
            "confirmed_at": t.confirmed_at,
            "completed_at": t.completed_at,
            "notes": t.notes,
            "problem": {
                "id": t.problem_id,
                # Safe access in case the related problem was manually deleted from the database
                "type": t.problem.type if t.problem else None,
                "severity": t.problem.severity if t.problem else None,
                "location": t.problem.location_text if t.problem else None,
                "urgency_score": t.problem.urgency_score if t.problem else None,
            },
            "assignee": {
                "volunteer_id": t.volunteer_id,
                # Following nested relationships: Task -> Volunteer -> User -> Name
                "name": t.volunteer.user.name if (t.volunteer and t.volunteer.user) else "Unassigned"
            }
        })
        
    return {
        "count": len(response),
        "tasks": response
    }


@router.get("/my-tasks")
def get_my_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_volunteer),
):
    volunteer = db.query(Volunteer).filter(Volunteer.user_id == current_user.id).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer profile not found")

    tasks = db.query(Task).filter(Task.volunteer_id == volunteer.id).all()

    response = []
    for t in tasks:
        ai_steps = []
        if t.ai_steps:
            try:
                ai_steps = json.loads(t.ai_steps)
            except (json.JSONDecodeError, TypeError):
                ai_steps = []

        response.append(
            {
                "task_id": t.id,
                "status": t.status,
                "assigned_at": t.assigned_at,
                "confirmed_at": t.confirmed_at,
                "completed_at": t.completed_at,
                "notes": t.notes,
                "problem": {
                    "id": t.problem_id,
                    "type": t.problem.type if t.problem else None,
                    "description": t.problem.description if t.problem else None,
                    "severity": t.problem.severity if t.problem else None,
                    "location": t.problem.location_text if t.problem else None,
                },
                "ai_explanation": {
                    "summary": t.ai_summary or "",
                    "suggested_solution": t.ai_solution or "",
                    "steps": ai_steps,
                },
            }
        )

    return {"count": len(response), "tasks": response}


@router.put("/update-task-status")
async def update_task_status(
    task_id: int = Form(...),
    status: str = Form(...),
    notes: str = Form(None),
    proof_image: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_volunteer),
):
    volunteer = db.query(Volunteer).filter(Volunteer.user_id == current_user.id).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer profile not found")

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.volunteer_id != volunteer.id:
        raise HTTPException(status_code=403, detail="You can only update your own tasks")

    proof_image_url = None
    if proof_image and status.lower() in ["completed", "complete", "done"]:
        # Save image
        upload_dir = "static/proofs"
        os.makedirs(upload_dir, exist_ok=True)
        file_ext = proof_image.filename.split(".")[-1]
        file_name = f"proof_{task_id}_{int(datetime.now().timestamp())}.{file_ext}"
        file_path = os.path.join(upload_dir, file_name)
        with open(file_path, "wb") as f:
            f.write(await proof_image.read())
        proof_image_url = f"/static/proofs/{file_name}"

    target_status = _normalize_status(status)
    _apply_task_status_update(
        db=db,
        task=task,
        target_status=target_status,
        changed_by_user_id=current_user.id,
        changed_via="volunteer_api",
        notes=notes,
        proof_image_url=proof_image_url
    )
    db.commit()
    db.refresh(task)

    return {
        "message": "Task status updated successfully",
        "data": {
            "task_id": task.id,
            "status": task.status,
            "volunteer_id": task.volunteer_id,
            "completed_at": task.completed_at,
        },
    }


@router.post("/webhooks/sms-reply", response_class=PlainTextResponse)
def volunteer_sms_reply_webhook(
    From: str = Form(default=""),
    Body: str = Form(default=""),
    db: Session = Depends(get_db),
):
    text = (Body or "").strip().lower()
    if not text:
        return "Reply format: CONFIRM <task_id> or DECLINE <task_id>."

    match = re.search(r"(\d+)", text)
    if not match:
        return "Task id missing. Reply like: CONFIRM 12"

    task_id = int(match.group(1))
    if any(keyword in text for keyword in ["confirm", "accept", "active"]):
        target = TaskStatus.active
    elif any(keyword in text for keyword in ["decline", "reject", "no"]):
        target = TaskStatus.declined
    elif any(keyword in text for keyword in ["done", "complete", "completed"]):
        target = TaskStatus.completed
    else:
        return "Unknown action. Use CONFIRM, DECLINE, or COMPLETE followed by task id."

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return f"Task {task_id} was not found."

    if not task.volunteer:
        return "Task has no assigned volunteer."

    if _normalize_phone(From) != _normalize_phone(task.volunteer.phone):
        return "Your number does not match this task assignment."

    try:
        _apply_task_status_update(
            db=db,
            task=task,
            target_status=target,
            changed_by_user_id=task.volunteer.user_id,
            changed_via="sms_webhook",
            notes=f"SMS reply from {From}: {Body}",
        )
        db.commit()
    except HTTPException as exc:
        db.rollback()
        return exc.detail

    return f"Task {task_id} updated to {target.value}. Thank you."


@router.get("/task-history")
def get_task_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    entries = db.query(TaskHistory).order_by(TaskHistory.created_at.desc()).all()
    return {
        "count": len(entries),
        "history": [
            {
                "id": item.id,
                "task_id": item.task_id,
                "old_status": item.old_status,
                "new_status": item.new_status,
                "changed_by_user_id": item.changed_by_user_id,
                "changed_via": item.changed_via,
                "notes": item.notes,
                "created_at": item.created_at,
            }
            for item in entries
        ],
    }


@router.get("/tasks/{task_id}/history")
def get_single_task_history(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    entries = (
        db.query(TaskHistory)
        .filter(TaskHistory.task_id == task_id)
        .order_by(TaskHistory.created_at.desc())
        .all()
    )
    return {
        "task_id": task_id,
        "count": len(entries),
        "history": [
            {
                "id": item.id,
                "old_status": item.old_status,
                "new_status": item.new_status,
                "changed_by_user_id": item.changed_by_user_id,
                "changed_via": item.changed_via,
                "notes": item.notes,
                "created_at": item.created_at,
            }
            for item in entries
        ],
    }

@router.get("/activity/recent")
def get_recent_activity(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Fetch the last 10 task history entries to show as recent activity."""
    activities = (
        db.query(TaskHistory)
        .order_by(TaskHistory.created_at.desc())
        .limit(10)
        .all()
    )
    
    result = []
    for act in activities:
        result.append({
            "id": act.id,
            "task_id": act.task_id,
            "new_status": act.new_status,
            "changed_via": act.changed_via,
            "notes": act.notes,
            "created_at": act.created_at,
            "problem_type": act.task.problem.type if act.task and act.task.problem else "Unknown",
            "volunteer_name": act.task.volunteer.user.name if act.task and act.task.volunteer and act.task.volunteer.user else "AI System"
        })
    return result
