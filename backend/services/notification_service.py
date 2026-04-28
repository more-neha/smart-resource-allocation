"""
Notification Service — SmartAid (SRA AI)
Handles mock and Firebase push notifications for task assignments.
WhatsApp / Pywhatkit / Selenium automation has been fully removed.
"""
import json
import os
from dataclasses import dataclass
from typing import Optional

from dotenv import load_dotenv

load_dotenv()


@dataclass
class NotificationResult:
    provider: str
    success: bool
    external_id: Optional[str] = None
    error: Optional[str] = None


def _normalize_phone(phone: str) -> str:
    """Clean and format phone numbers.  Defaults to +91 for 10-digit numbers."""
    cleaned = "".join(ch for ch in (phone or "") if ch.isdigit() or ch == "+")
    if not cleaned:
        return ""
    if cleaned.startswith("+"):
        digits = cleaned[1:]
        if digits.startswith("0") and len(digits) == 11:
            return "+91" + digits[1:]
        return cleaned
    digits = cleaned
    if len(digits) == 10:
        return "+91" + digits
    if len(digits) == 11 and digits.startswith("0"):
        return "+91" + digits[1:]
    if len(digits) == 12 and digits.startswith("91"):
        return "+" + digits
    return "+" + digits


def build_assignment_message(
    task_id: int,
    problem_description: str,
    location: str,
    contact_name: str,
) -> str:
    short_description = (problem_description or "No description").strip()
    if len(short_description) > 120:
        short_description = short_description[:117] + "..."
    return (
        f"Smart Resource Allocation Task #{task_id}\n"
        f"Problem: {short_description}\n"
        f"Location: {location or 'Unknown'}\n"
        f"Contact: {contact_name or 'NGO Admin'}\n"
        "Reply CONFIRM <task_id> to accept or DECLINE <task_id> to decline."
    )


def send_assignment_notification(phone: str, message: str) -> NotificationResult:
    """Send a notification via the configured provider (default: mock)."""
    provider = os.getenv("NOTIFICATION_PROVIDER", "mock").strip().lower()

    if provider == "firebase":
        return _send_via_firebase_push(phone=phone, message=message)

    # Mock mode — useful for local development / hackathon demos.
    return NotificationResult(
        provider="mock",
        success=True,
        external_id="mock-delivery",
    )


def _send_via_firebase_push(phone: str, message: str) -> NotificationResult:
    """Placeholder for Firebase Cloud Messaging push.  Actual device-token
    based push is handled by the dedicated /api/notifications endpoints."""
    return NotificationResult(
        provider="firebase_push",
        success=True,
        external_id="firebase-push-queued",
    )
