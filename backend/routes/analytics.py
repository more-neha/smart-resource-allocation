from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from database import get_db
from models.problem import Problem, ProblemStatus
from models.task import Task, TaskStatus
from models.volunteer import Volunteer
from auth_dependencies import require_admin
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta
import math

router = APIRouter()

@router.get("/analytics/impact")
def get_impact_analytics(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Calculate impact metrics:
    - Total tasks completed
    - Total people helped
    - Unique areas resolved
    """
    completed_tasks = db.query(Task).filter(Task.status == TaskStatus.completed).all()
    
    total_completed = len(completed_tasks)
    
    # Get problem IDs for completed tasks to avoid double counting people helped if multiple tasks per problem
    problem_ids = {t.problem_id for t in completed_tasks}
    
    total_people_helped = db.query(func.sum(Problem.people_affected))\
        .filter(Problem.id.in_(problem_ids))\
        .scalar() or 0
        
    unique_areas = db.query(func.count(distinct(Problem.location_text)))\
        .filter(Problem.id.in_(problem_ids))\
        .scalar() or 0
        
    return {
        "total_tasks_completed": total_completed,
        "total_people_helped": int(total_people_helped),
        "unique_areas_resolved": unique_areas
    }

@router.get("/analytics/predictions")
def get_predictive_hotspots(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Identify high-risk areas based on multiple recent reports.
    Groups problems by proximity (rounded lat/lng).
    """
    # Look at pending or active problems from the last 7 days
    recent_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    
    problems = db.query(Problem).filter(
        Problem.status.in_([ProblemStatus.pending, ProblemStatus.active]),
        Problem.created_at >= recent_cutoff
    ).all()
    
    hotspots = []
    clusters = {}
    
    # Simple clustering by rounding coordinates to 2 decimal places (~1.1km precision)
    for p in problems:
        if p.latitude and p.longitude:
            key = (round(p.latitude, 2), round(p.longitude, 2))
            if key not in clusters:
                clusters[key] = []
            clusters[key].append(p)
            
    for (lat, lon), group in clusters.items():
        if len(group) >= 2: # At least 2 reports in the same area
            avg_severity = sum(p.severity for p in group) / len(group)
            hotspots.append({
                "latitude": lat,
                "longitude": lon,
                "risk_level": "High" if len(group) > 3 or avg_severity > 4 else "Moderate",
                "report_count": len(group),
                "avg_severity": round(avg_severity, 1),
                "message": "Likely issues in next 48 hrs"
            })
            
    return {"hotspots": hotspots}

@router.get("/analytics/resource-gap")
def get_resource_gap_detection(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    gap = number_of_problems / number_of_volunteers per area.
    """
    problems = db.query(Problem).filter(Problem.status == ProblemStatus.pending).all()
    volunteers = db.query(Volunteer).all()
    
    gaps = []
    areas = {}
    
    # Cluster problems by area
    for p in problems:
        if p.location_text:
            area = p.location_text.split(",")[0].strip().lower()
            if area not in areas:
                areas[area] = {"problems": 0, "volunteers": 0, "full_name": p.location_text}
            areas[area]["problems"] += 1
            
    # Count volunteers in those areas
    for v in volunteers:
        if v.address:
            v_area = v.address.split(",")[0].strip().lower()
            if v_area in areas:
                areas[v_area]["volunteers"] += 1
                
    for area_name, stats in areas.items():
        prob_count = stats["problems"]
        vol_count = stats["volunteers"]
        
        # If no volunteers, the gap is infinite or high
        gap_score = prob_count / (vol_count if vol_count > 0 else 0.5)
        
        if gap_score > 1.5: # Arbitrary threshold for "High Problem, Low Volunteer"
            gaps.append({
                "area": stats["full_name"],
                "gap_score": round(gap_score, 2),
                "problem_count": prob_count,
                "volunteer_count": vol_count,
                "alert": f"High problems, low volunteers in {stats['full_name']}"
            })
            
    return {"gaps": gaps}

@router.post("/analytics/simulate")
def simulate_scenario(
    data: Dict[str, Any],
    current_user=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Estimate:
    - Affected area
    - Required volunteers
    - Response time
    """
    location_name = data.get("location", "Unknown")
    problem_type = data.get("type", "General Emergency")
    severity = data.get("severity", 3)
    
    # Mock estimation logic
    affected_radius = severity * 1.5 # km
    required_volunteers = math.ceil(severity * 2.5)
    
    # Try to find average response time based on volunteer proximity
    # For simulation, we'll just return some realistic mock data based on input
    estimated_response_time = 15 + (severity * 10) # minutes
    
    return {
        "scenario": {
            "location": location_name,
            "type": problem_type,
            "severity": severity
        },
        "estimates": {
            "affected_area_km2": round(math.pi * (affected_radius**2), 2),
            "affected_radius_km": affected_radius,
            "required_volunteers": required_volunteers,
            "avg_response_time_min": estimated_response_time
        },
        "visual_overlay": {
            "shape": "circle",
            "color": "#ef4444",
            "opacity": 0.3
        }
    }
