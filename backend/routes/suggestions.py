"""Volunteer Suggestions with Gemini AI integration."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.problem import Problem
from models.volunteer import Volunteer
from models.user import User
from auth_dependencies import require_admin
from services.gemini_service import suggest_volunteers_ai

router = APIRouter()


@router.get("/suggest-volunteers/{problem_id}")
def suggest_volunteers(
    problem_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Hybrid assignment: suggest top 5 volunteers for a problem based on
    local scoring + Gemini AI ranking.
    """
    problem = db.query(Problem).filter(Problem.id == problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    volunteers = db.query(Volunteer).all()
    if not volunteers:
        return {"problem_id": problem_id, "suggestions": [], "ai_analysis": ""}

    problem_type = (problem.type or "").lower()
    problem_location = (problem.location_text or "").lower()

    scored = []
    volunteer_data_for_ai = []

    for v in volunteers:
        score = 0
        v_profession = (v.profession or "").lower()
        v_address = (v.address or "").lower()

        if problem_type and problem_type in v_profession:
            score += 40
        for keyword in problem_type.split():
            if keyword in v_profession:
                score += 10

        if problem_location and problem_location in v_address:
            score += 30
        elif v_address and v_address in problem_location:
            score += 20

        scored.append({
            "volunteer_id": v.id,
            "name": v.user.name if v.user else "Unknown",
            "email": v.user.email if v.user else "Unknown",
            "first_name": v.first_name,
            "last_name": v.last_name,
            "phone": v.phone,
            "address": v.address,
            "profession": v.profession,
            "rating": v.rating,
            "tasks_completed": v.tasks_completed,
            "avg_response_time": v.avg_response_time,
            "relevance_score": score,
        })

        volunteer_data_for_ai.append({
            "id": v.id,
            "name": v.user.name if v.user else "Unknown",
            "profession": v.profession or "N/A",
            "address": v.address or "N/A",
        })

    scored.sort(key=lambda x: x["relevance_score"], reverse=True)

    # Get Gemini AI analysis
    ai_result = suggest_volunteers_ai(
        problem_type=problem.type or "Unknown",
        severity=problem.severity or 1,
        location=problem.location_text or "Unknown",
        description=problem.description or "",
        volunteers=volunteer_data_for_ai,
    )

    if not ai_result.get("error"):
        ai_volunteers = {v["id"]: v for v in ai_result.get("best_volunteers", [])}
        for s in scored:
            vid = s["volunteer_id"]
            if vid in ai_volunteers:
                s["relevance_score"] = ai_volunteers[vid].get("score", s["relevance_score"])
                s["ai_reason"] = ai_volunteers[vid].get("reason", "")
        
        # Re-sort after applying AI scores
        scored.sort(key=lambda x: x["relevance_score"], reverse=True)
    
    return {
        "problem_id": problem_id,
        "problem_type": problem.type,
        "problem_location": problem.location_text,
        "suggestions": scored[:5],
        "ai_analysis": ai_result,
    }
