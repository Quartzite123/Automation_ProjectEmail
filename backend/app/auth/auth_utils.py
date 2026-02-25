"""
JWT creation / verification + bcrypt password hashing.
"""
import bcrypt
import hashlib
import secrets
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from app.config.settings import JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_HOURS


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode(), salt).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload["exp"] = expire
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Raises JWTError if the token is invalid / expired.
    """
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


# ---------------------------------------------------------------------------
# Password reset token
# ---------------------------------------------------------------------------

def generate_reset_token() -> tuple[str, str, datetime]:
    """
    Generate a secure password-reset token.

    Returns
    -------
    (raw_token, token_hash, expiry)
    raw_token  : str      - sent in the reset link (never stored)
    token_hash : str      - SHA-256 hex digest stored in MongoDB
    expiry     : datetime - UTC timestamp 30 minutes from now
    """
    raw_token  = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expiry     = datetime.now(timezone.utc) + timedelta(minutes=30)
    return raw_token, token_hash, expiry
