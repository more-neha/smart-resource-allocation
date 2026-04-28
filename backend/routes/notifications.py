"""Firebase Push Notifications API — register tokens and send push notifications."""
import os
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.user import User
from models.fcm_token import FCMToken
from models.volunteer import Volunteer
from auth_dependencies import get_current_user, require_admin
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()


class TokenRegister(BaseModel):
    token: str


class PushNotification(BaseModel):
    title: str
    body: str
    user_id: int


def _get_firebase_app():
    """Lazily initialize Firebase Admin SDK."""
    try:
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:
            cred_path = os.getenv("FIREBASE_ADMIN_CREDENTIALS", "")
            if cred_path and os.path.isfile(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                return None
        return firebase_admin.get_app()
    except Exception:
        return None


@router.post("/notifications/register-token")
def register_fcm_token(
    data: TokenRegister,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a Firebase Cloud Messaging token for push notifications."""
    existing = db.query(FCMToken).filter(FCMToken.token == data.token).first()
    if existing:
        existing.user_id = current_user.id
        db.commit()
        return {"message": "Token updated"}

    new_token = FCMToken(user_id=current_user.id, token=data.token)
    db.add(new_token)
    db.commit()
    return {"message": "Token registered successfully"}


@router.post("/notifications/send")
def send_push_notification(
    data: PushNotification,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin: Send a push notification to a specific user."""
    tokens = db.query(FCMToken).filter(FCMToken.user_id == data.user_id).all()
    if not tokens:
        raise HTTPException(status_code=404, detail="No device tokens found for this user")

    app = _get_firebase_app()
    if not app:
        return {
            "message": "Firebase Admin SDK not configured. Notification queued (mock).",
            "sent_count": 0,
            "mock": True,
        }

    try:
        from firebase_admin import messaging

        sent = 0
        for t in tokens:
            msg = messaging.Message(
                notification=messaging.Notification(title=data.title, body=data.body),
                token=t.token,
            )
            try:
                messaging.send(msg)
                sent += 1
            except Exception:
                db.delete(t)

        db.commit()
        return {"message": "Notifications sent", "sent_count": sent}
    except ImportError:
        return {
            "message": "firebase-admin not installed. Notification queued (mock).",
            "sent_count": 0,
            "mock": True,
        }


def send_task_assignment_push(db: Session, volunteer_id: int, task_id: int, problem_type: str):
    """Utility: send push notification when task is assigned to a volunteer."""
    volunteer = db.query(Volunteer).filter(Volunteer.id == volunteer_id).first()
    if not volunteer:
        return

    tokens = db.query(FCMToken).filter(FCMToken.user_id == volunteer.user_id).all()
    if not tokens:
        return

    app = _get_firebase_app()
    if not app:
        return

    try:
        from firebase_admin import messaging

        for t in tokens:
            msg = messaging.Message(
                notification=messaging.Notification(
                    title="New Task Assigned",
                    body=f"New task assigned near you: {problem_type} (Task #{task_id})",
                ),
                data={"task_id": str(task_id), "click_action": "/volunteer-dashboard"},
                token=t.token,
            )
            try:
                messaging.send(msg)
            except Exception:
                db.delete(t)

        db.commit()
    except ImportError:
        pass
