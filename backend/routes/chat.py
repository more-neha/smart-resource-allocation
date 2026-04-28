"""Chat routes — human-to-admin chat + SRA AI chat system."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user import User, UserRole
from models.chat import Chat
from schemas import ChatMessageCreate
from auth_dependencies import get_current_user, require_admin
from services.gemini_service import ai_chat_response
from pydantic import BaseModel

router = APIRouter()


class AIChatRequest(BaseModel):
    message: str


@router.post("/send")
def send_message(
    data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a chat message. For rejected users ↔ admin communication."""
    receiver = db.query(User).filter(User.id == data.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found.")

    msg = Chat(
        sender_id=current_user.id,
        receiver_id=data.receiver_id,
        message=data.message,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    return {
        "message": "Message sent",
        "chat_id": msg.id,
        "created_at": str(msg.created_at),
    }


@router.get("/messages/{other_user_id}")
def get_messages(
    other_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all messages between current user and another user."""
    messages = (
        db.query(Chat)
        .filter(
            (
                (Chat.sender_id == current_user.id) & (Chat.receiver_id == other_user_id)
            )
            | (
                (Chat.sender_id == other_user_id) & (Chat.receiver_id == current_user.id)
            )
        )
        .order_by(Chat.created_at.asc())
        .all()
    )

    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "receiver_id": m.receiver_id,
            "message": m.message,
            "created_at": str(m.created_at),
            "is_mine": m.sender_id == current_user.id,
        }
        for m in messages
    ]


@router.get("/admin-list")
def get_admin_list_for_chat(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get list of admins the user can chat with."""
    admins = (
        db.query(User)
        .filter(User.role.in_([UserRole.admin, UserRole.super_admin]))
        .all()
    )
    return [
        {"id": a.id, "name": a.name, "email": a.email}
        for a in admins
    ]


@router.post("/ai")
def chat_with_sra_ai(
    data: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """SRA AI Chat — Gemini-powered intelligent responses."""
    user_msg = data.message.strip()
    if not user_msg:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Store user message in chat logs (sender = user, receiver = 0 means AI)
    user_chat = Chat(
        sender_id=current_user.id,
        receiver_id=current_user.id,  # self-reference for AI chats
        message=f"[USER] {user_msg}",
    )
    db.add(user_chat)

    # Get AI response
    context = f"User role: {current_user.role.value}, Name: {current_user.name}"
    ai_response = ai_chat_response(user_message=user_msg, context=context)

    # Store AI response
    ai_chat = Chat(
        sender_id=current_user.id,
        receiver_id=current_user.id,
        message=f"[SRA AI] {ai_response}",
    )
    db.add(ai_chat)
    db.commit()

    return {
        "user_message": user_msg,
        "ai_response": ai_response,
    }


@router.get("/ai/history")
def get_ai_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get AI chat history for the current user."""
    messages = (
        db.query(Chat)
        .filter(
            Chat.sender_id == current_user.id,
            Chat.receiver_id == current_user.id,
        )
        .order_by(Chat.created_at.asc())
        .all()
    )

    return [
        {
            "id": m.id,
            "message": m.message,
            "created_at": str(m.created_at),
            "is_ai": m.message.startswith("[SRA AI]"),
        }
        for m in messages
    ]
