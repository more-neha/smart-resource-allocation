from dotenv import load_dotenv
load_dotenv()

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "FATAL: DATABASE_URL environment variable is not set. "
        "Set it in backend/.env before starting the server."
    )

# Create the database engine with SSL required
engine = create_engine(DATABASE_URL, connect_args={"sslmode": "require"})

# SessionLocal is a factory to create new Database Sessions.
# autocommit=False prevents accidental database changes without explicitly committing
# autoflush=False prevents sending queries prematurely
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our models so SQLAlchemy knows how to map them to database tables
Base = declarative_base()

# Dependency to manage Database Sessions lifecycle per request
def get_db():
    db = SessionLocal()
    try:
        # yield returns a database session to the API endpoint
        yield db
    finally:
        # Best Practice: Always close the session to prevent database connection leaks
        db.close()
