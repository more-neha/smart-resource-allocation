from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models.problem import Problem, ProblemStatus


def _recency_factor(created_at: datetime | None) -> float:
    if not created_at:
        return 1.0

    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    age_days = max((now - created_at).days, 0)
    if age_days <= 1:
        return 1.0
    if age_days <= 7:
        return 0.85
    if age_days <= 30:
        return 0.65
    return 0.4


def calculate_problem_urgency(problem: Problem, frequency: int) -> float:
    if problem.status == ProblemStatus.completed:
        return 0.0

    safe_frequency = max(frequency, 1)
    severity = max(problem.severity or 1, 1)
    people_affected = max(problem.people_affected or 0, 0)
    people_factor = 1 + min(people_affected / 100.0, 5)

    return round(safe_frequency * severity * _recency_factor(problem.created_at) * people_factor, 2)


def recalculate_problem_urgency(db: Session, problem: Problem) -> float:
    if not problem:
        return 0.0

    frequency = (
        db.query(Problem)
        .filter(
            Problem.type == problem.type,
            Problem.location_text == problem.location_text,
            Problem.status.in_([ProblemStatus.pending, ProblemStatus.active]),
        )
        .count()
    )

    problem.urgency_score = calculate_problem_urgency(problem=problem, frequency=frequency)
    return problem.urgency_score


def recalculate_related_problems_for_area(db: Session, source_problem: Problem) -> None:
    if not source_problem:
        return

    related = (
        db.query(Problem)
        .filter(
            Problem.type == source_problem.type,
            Problem.location_text == source_problem.location_text,
        )
        .all()
    )

    for problem in related:
        recalculate_problem_urgency(db=db, problem=problem)
