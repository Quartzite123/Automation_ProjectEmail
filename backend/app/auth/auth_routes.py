"""
Authentication routes.
POST /api/auth/login           — register-or-login combined endpoint.
GET  /api/auth/me              — returns current user info from token.
POST /api/auth/forgot-password — send password-reset email.
POST /api/auth/reset-password  — apply new password using reset token.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime, timezone
import hashlib
from app.database import get_db
from app.auth.auth_utils import hash_password, verify_password, create_access_token, generate_reset_token
from app.auth.dependencies import get_current_user
from app.models.user_model import LoginRequest, TokenResponse, UserOut, CurrentUser, ForgotPasswordRequest, ResetPasswordRequest
from app.config.settings import AUTO_ADMIN_EMAILS, FRONTEND_URL
from app.services.email_service import send_reset_email

router = APIRouter()


def _is_auto_admin(email: str) -> bool:
    """Return True if this email should always be admin+write+active."""
    return email.strip().lower() in AUTO_ADMIN_EMAILS


async def _ensure_auto_admin(users_col, email: str, user: dict) -> dict:
    """
    If the email is in AUTO_ADMIN_EMAILS, unconditionally promote the user
    to admin / write / active in MongoDB and return the updated user dict.
    This is a no-op for all other emails.
    """
    if not _is_auto_admin(email):
        return user

    await users_col.update_one(
        {"email": email},
        {
            "$set": {
                "role":       "admin",
                "permission": "write",
                "status":     "active",
            }
        },
    )
    return {**user, "role": "admin", "permission": "write", "status": "active"}


@router.post("/login", response_model=TokenResponse | dict)
async def login_or_register(body: LoginRequest):
    """
    Combined register-or-login endpoint.

    • If the email is new  → create account (first user = admin+active, others = pending).
    • If the email exists  → verify password, check status.
    • Returns JWT if active; validation message otherwise.
    """
    db = get_db()
    users_col = db["users"]
    email = body.email  # already normalised by validator

    existing = await users_col.find_one({"email": email})

    # ------------------------------------------------------------------ LOGIN
    if existing:
        if not verify_password(body.password, existing["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password",
            )

        # Auto-admin promotion — runs before status checks so a previously
        # pending auto-admin email is immediately activated.
        existing = await _ensure_auto_admin(users_col, email, existing)

        if existing["status"] == "pending":
            return {"message": "Your account is pending admin approval."}

        if existing["status"] == "rejected":
            return {"message": "Your account request was rejected. Contact an admin."}

        # active → issue token
        token = create_access_token({
            "email": existing["email"],
            "role": existing["role"],
            "permission": existing["permission"],
        })

        user_out = UserOut(
            email=existing["email"],
            role=existing["role"],
            permission=existing["permission"],
            status=existing["status"],
            created_at=existing["created_at"],
            approved_by=existing.get("approved_by"),
            approved_at=existing.get("approved_at"),
        )

        return TokenResponse(access_token=token, user=user_out)

    # ---------------------------------------------------------------- REGISTER
    # Check if this is the very first user
    total_users = await users_col.count_documents({})

    if total_users == 0 or _is_auto_admin(email):
        # First user OR auto-admin email → admin, active
        role = "admin"
        permission = "write"
        user_status = "active"
    else:
        role = "user"
        permission = "read"
        user_status = "pending"

    new_user = {
        "email": email,
        "password_hash": hash_password(body.password),
        "role": role,
        "permission": permission,
        "status": user_status,
        "created_at": datetime.now(timezone.utc),
        "approved_by": None,
        "approved_at": None,
    }

    await users_col.insert_one(new_user)

    if user_status == "pending":
        return {"message": "Account created. Your request has been sent for admin approval."}

    # First user → issue token immediately
    token = create_access_token({
        "email": email,
        "role": role,
        "permission": permission,
    })

    user_out = UserOut(
        email=email,
        role=role,
        permission=permission,
        status=user_status,
        created_at=new_user["created_at"],
    )

    return TokenResponse(access_token=token, user=user_out)


@router.get("/me", response_model=CurrentUser)
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    """Return the currently authenticated user's info."""
    return current_user


# ---------------------------------------------------------------------------
# Forgot password
# ---------------------------------------------------------------------------

@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    """
    Request a password-reset email.

    Always returns the same response regardless of whether the email exists,
    to prevent user enumeration.
    """
    _SAFE_RESPONSE = {"message": "If the email exists, a reset link has been sent."}

    db = get_db()
    users_col = db["users"]
    user = await users_col.find_one({"email": body.email})

    if user:
        raw_token, token_hash, expiry = generate_reset_token()

        await users_col.update_one(
            {"email": body.email},
            {
                "$set": {
                    "reset_token_hash":   token_hash,
                    "reset_token_expiry": expiry,
                }
            },
        )

        reset_link = f"{FRONTEND_URL.rstrip('/')}/reset-password?token={raw_token}"

        try:
            await send_reset_email(email=body.email, reset_link=reset_link)
        except Exception:
            # Do not expose send failures — log is printed inside send_reset_email
            pass

    return _SAFE_RESPONSE


# ---------------------------------------------------------------------------
# Reset password
# ---------------------------------------------------------------------------

@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest):
    """
    Apply a new password using a valid, unexpired reset token.
    """
    token_hash = hashlib.sha256(body.token.encode()).hexdigest()
    now        = datetime.now(timezone.utc)

    db = get_db()
    users_col = db["users"]

    user = await users_col.find_one({"reset_token_hash": token_hash})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    expiry = user.get("reset_token_expiry")
    if expiry is None or (expiry.tzinfo is None and expiry.replace(tzinfo=timezone.utc) < now) or (expiry.tzinfo is not None and expiry < now):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    new_hash = hash_password(body.new_password)

    await users_col.update_one(
        {"reset_token_hash": token_hash},
        {
            "$set":   {"password_hash": new_hash},
            "$unset": {"reset_token_hash": "", "reset_token_expiry": ""},
        },
    )

    return {"message": "Password has been reset successfully. You can now log in."}
