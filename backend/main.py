from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from datetime import datetime, timedelta, timezone

from sqlalchemy import inspect, text

from database import engine, Base, SessionLocal
from routes import resources, problems, volunteers, tasks
from routes import admin as admin_routes
from routes import chat as chat_routes
from routes import suggestions as suggestion_routes
from routes import programs_crud as programs_routes
from routes import notifications as notification_routes
from models.user import User, UserRole
from models.chat import Chat
from security import hash_password
import models  # This triggers the imports in models/__init__.py, registering them to Base


# --- Enum migration for PostgreSQL ---
def ensure_enum_values():
    """Add new enum values (user, super_admin) to the PostgreSQL userrole type."""
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        try:
            result = conn.execute(text(
                "SELECT enumlabel FROM pg_enum "
                "JOIN pg_type ON pg_enum.enumtypid = pg_type.oid "
                "WHERE pg_type.typname = 'userrole'"
            ))
            existing_values = {row[0] for row in result}

            if "user" not in existing_values:
                conn.execute(text("ALTER TYPE userrole ADD VALUE 'user'"))
            if "super_admin" not in existing_values:
                conn.execute(text("ALTER TYPE userrole ADD VALUE 'super_admin'"))
        except Exception as e:
            pass


ensure_enum_values()

# 1. Create the database tables
Base.metadata.create_all(bind=engine)


def ensure_problem_columns() -> None:
    """Add new columns to the problems table if they don't exist."""
    inspector = inspect(engine)
    if "problems" not in inspector.get_table_names():
        return

    existing_columns = {col["name"] for col in inspector.get_columns("problems")}
    new_columns = {
        "first_name": "VARCHAR",
        "last_name": "VARCHAR",
        "phone": "VARCHAR",
        "image_url": "VARCHAR",
        "location_text": "VARCHAR",
        "urgency_score": "FLOAT DEFAULT 0",
        "created_at": "TIMESTAMP",
        "updated_at": "TIMESTAMP",
        "verification_status": "VARCHAR DEFAULT 'pending'",
        "ai_confidence": "FLOAT",
        "ai_summary": "TEXT",
        "reviewed_by_user_id": "INTEGER",
        "reviewed_at": "TIMESTAMP",
        "review_notes": "TEXT",
    }

    with engine.begin() as connection:
        for col_name, col_type in new_columns.items():
            if col_name not in existing_columns:
                connection.execute(text(f"ALTER TABLE problems ADD COLUMN {col_name} {col_type}"))

        if "created_at" not in existing_columns:
            connection.execute(text("UPDATE problems SET created_at = NOW() WHERE created_at IS NULL"))
        if "updated_at" not in existing_columns:
            connection.execute(text("UPDATE problems SET updated_at = NOW() WHERE updated_at IS NULL"))


def ensure_task_enum_values() -> None:
    """Ensure PostgreSQL taskstatus enum contains all statuses used by the app."""
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        try:
            result = conn.execute(text(
                "SELECT enumlabel FROM pg_enum "
                "JOIN pg_type ON pg_enum.enumtypid = pg_type.oid "
                "WHERE pg_type.typname = 'taskstatus'"
            ))
            existing_values = {row[0] for row in result}

            if "assigned" not in existing_values:
                conn.execute(text("ALTER TYPE taskstatus ADD VALUE 'assigned'"))
            if "active" not in existing_values:
                conn.execute(text("ALTER TYPE taskstatus ADD VALUE 'active'"))
            if "declined" not in existing_values:
                conn.execute(text("ALTER TYPE taskstatus ADD VALUE 'declined'"))
        except Exception:
            pass


def ensure_task_columns() -> None:
    inspector = inspect(engine)
    if "tasks" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("tasks")}
    columns_to_add = {
        "assigned_at": "TIMESTAMP",
        "confirmed_at": "TIMESTAMP",
        "completed_at": "TIMESTAMP",
        "notes": "TEXT",
        "last_notification_provider": "VARCHAR",
        "last_notification_status": "VARCHAR",
        "last_notification_error": "TEXT",
        "ai_summary": "TEXT",
        "ai_solution": "TEXT",
        "ai_steps": "TEXT",
        "proof_image_url": "VARCHAR",
    }

    with engine.begin() as connection:
        for column_name, column_type in columns_to_add.items():
            if column_name not in existing_columns:
                connection.execute(text(f"ALTER TABLE tasks ADD COLUMN {column_name} {column_type}"))

        if "assigned_at" not in existing_columns:
            connection.execute(text("UPDATE tasks SET assigned_at = NOW() WHERE assigned_at IS NULL"))


def ensure_user_columns() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    if "profile_complete" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN profile_complete BOOLEAN DEFAULT FALSE"))


def ensure_volunteer_columns() -> None:
    inspector = inspect(engine)
    if "volunteers" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("volunteers")}
    columns_to_add = {
        "first_name": "VARCHAR",
        "last_name": "VARCHAR",
        "phone": "VARCHAR",
        "address": "VARCHAR",
        "profession": "VARCHAR",
        "rating": "INTEGER DEFAULT 5",
        "tasks_completed": "INTEGER DEFAULT 0",
        "avg_response_time": "INTEGER DEFAULT 0",
    }

    with engine.begin() as connection:
        for column_name, column_type in columns_to_add.items():
            if column_name not in existing_columns:
                connection.execute(text(f"ALTER TABLE volunteers ADD COLUMN {column_name} {column_type}"))


def ensure_volunteer_request_columns() -> None:
    inspector = inspect(engine)
    if "volunteer_requests" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("volunteer_requests")}
    columns_to_add = {
        "first_name": "VARCHAR",
        "last_name": "VARCHAR",
        "phone": "VARCHAR",
        "address": "VARCHAR",
        "profession": "VARCHAR",
    }

    with engine.begin() as connection:
        for column_name, column_type in columns_to_add.items():
            if column_name not in existing_columns:
                connection.execute(text(f"ALTER TABLE volunteer_requests ADD COLUMN {column_name} {column_type}"))


def seed_super_admin() -> None:
    """Ensure super admin account exists."""
    super_email = os.getenv("SUPER_ADMIN_EMAIL", "sra.platformtech@gmail.com")
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == super_email).first()
        if existing:
            if existing.role != UserRole.super_admin:
                existing.role = UserRole.super_admin
                existing.profile_complete = True
                db.commit()
    finally:
        db.close()


def cleanup_old_chats() -> None:
    """Delete chat messages older than 5 days."""
    db = SessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=5)
        db.query(Chat).filter(Chat.created_at < cutoff).delete()
        db.commit()
    finally:
        db.close()


ensure_problem_columns()
ensure_task_enum_values()
ensure_task_columns()
ensure_user_columns()
ensure_volunteer_columns()
ensure_volunteer_request_columns()
seed_super_admin()
cleanup_old_chats()

# 2. Initialize the FastAPI app
app = FastAPI(title="SmartAid — SRA AI API")

# 3. Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Register route modules
app.include_router(resources.router, prefix="/api/resources", tags=["Resources"])
app.include_router(problems.router, tags=["Problems"])
app.include_router(volunteers.router, tags=["Volunteers"])
app.include_router(tasks.router, tags=["Tasks"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["Admin Management"])
app.include_router(chat_routes.router, prefix="/api/chat", tags=["Chat"])
app.include_router(suggestion_routes.router, prefix="/api", tags=["Suggestions"])
app.include_router(programs_routes.router, tags=["Programs"])
from routes import analytics as analytics_routes
app.include_router(analytics_routes.router, prefix="/api", tags=["Analytics"])
app.include_router(notification_routes.router, prefix="/api", tags=["Notifications"])

from fastapi.staticfiles import StaticFiles
app.mount("/static", StaticFiles(directory="static"), name="static")

# 5. Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to SmartAid — SRA AI API!"}


# 6. Background scheduler for chat cleanup
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(cleanup_old_chats, "interval", hours=6)
    scheduler.start()
except ImportError:
    pass
