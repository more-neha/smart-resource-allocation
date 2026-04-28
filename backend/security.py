import os
from datetime import datetime, timedelta, timezone
from typing import Any
from jose import JWTError, jwt
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
if not SECRET_KEY or SECRET_KEY == "change-this-in-production" or len(SECRET_KEY) < 32:
    import warnings
    warnings.warn(
        "⚠️  JWT_SECRET_KEY is weak or missing! "
        "Generate a secure key: python -c \"import secrets; print(secrets.token_urlsafe(64))\" "
        "and set it in backend/.env",
        RuntimeWarning,
        stacklevel=2,
    )
    # Auto-generate for development only — NEVER rely on this in production
    if not SECRET_KEY or SECRET_KEY == "change-this-in-production":
        import secrets as _secrets
        SECRET_KEY = _secrets.token_urlsafe(64)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


def hash_password(password: str) -> str:
    """Return a secure hash for the provided plain-text password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate JWT token payload."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
