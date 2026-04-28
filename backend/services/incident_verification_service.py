from models.problem import Problem


HIGH_PRIORITY_KEYWORDS = {
    "flood",
    "fire",
    "collapse",
    "medical",
    "injury",
    "earthquake",
    "water",
    "ambulance",
    "food",
}

LOW_TRUST_KEYWORDS = {
    "test",
    "dummy",
    "random",
    "asdf",
    "trial",
}


def analyze_incident(problem: Problem) -> dict:
    description = (problem.description or "").lower()
    problem_type = (problem.type or "").lower()

    severity = max(problem.severity or 1, 1)
    affected = max(problem.people_affected or 0, 0)

    score = 0.0
    reasons = []

    score += severity * 0.18
    score += min(affected / 50.0, 2.0)

    if len(description.strip()) >= 20:
        score += 0.6
        reasons.append("description has useful detail")
    else:
        score -= 0.4
        reasons.append("description is too short")

    if any(keyword in description or keyword in problem_type for keyword in HIGH_PRIORITY_KEYWORDS):
        score += 1.0
        reasons.append("critical incident keywords detected")

    if any(keyword in description or keyword in problem_type for keyword in LOW_TRUST_KEYWORDS):
        score -= 1.0
        reasons.append("possible spam/test keywords detected")

    if severity >= 4:
        reasons.append("high severity report")
    if affected >= 20:
        reasons.append("many people affected")

    confidence = max(min(score / 4.0, 1.0), 0.0)

    if score >= 1.8:
        action = "verify"
    else:
        action = "reject"

    summary = "; ".join(reasons) if reasons else "insufficient evidence"

    return {
        "recommended_action": action,
        "confidence": round(confidence, 2),
        "summary": summary,
    }
