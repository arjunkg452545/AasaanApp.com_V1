"""
Forgot Password Flow — Email OTP based.
3 endpoints: forgot-password → verify-otp → reset-password.
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
import random
import uuid

from database import db
from auth import hash_password
from email_service import send_otp_email
from models_payment import ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest

router = APIRouter(prefix="/api", tags=["password-reset"])

OTP_EXPIRY_MINUTES = 10
RESET_TOKEN_EXPIRY_MINUTES = 15


@router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Step 1: Member enters mobile → OTP sent to registered email."""
    # Find member credential
    cred = await db.member_credentials.find_one({"mobile": data.mobile}, {"_id": 0})
    if not cred:
        # Don't reveal if mobile exists
        return {"message": "If this mobile is registered, an OTP has been sent to the associated email."}

    # Find member record for email and name
    member = await db.members.find_one(
        {"member_id": cred["member_id"]},
        {"_id": 0, "email": 1, "full_name": 1}
    )
    if not member or not member.get("email"):
        return {"message": "If this mobile is registered, an OTP has been sent to the associated email.", "has_email": False}

    # Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))
    now = datetime.now(timezone.utc)

    # Store OTP (upsert by mobile)
    await db.password_reset_otps.update_one(
        {"mobile": data.mobile},
        {"$set": {
            "mobile": data.mobile,
            "otp": otp,
            "created_at": now.isoformat(),
            "expires_at": (now + timedelta(minutes=OTP_EXPIRY_MINUTES)).isoformat(),
            "verified": False,
            "attempts": 0,
        }},
        upsert=True,
    )

    # Send OTP email
    email = member["email"]
    name = member.get("full_name", "Member")
    sent = send_otp_email(email, otp, name)

    # Mask email for frontend display
    parts = email.split("@")
    if len(parts) == 2 and len(parts[0]) > 2:
        masked = parts[0][:2] + "*" * (len(parts[0]) - 2) + "@" + parts[1]
    else:
        masked = email

    return {
        "message": "OTP sent to registered email",
        "has_email": True,
        "masked_email": masked,
        "email_sent": sent,
    }


@router.post("/auth/verify-otp")
async def verify_otp(data: VerifyOTPRequest):
    """Step 2: Verify OTP → return reset_token."""
    record = await db.password_reset_otps.find_one({"mobile": data.mobile}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=400, detail="No OTP request found. Please request a new OTP.")

    # Check expiry
    expires_at = datetime.fromisoformat(record["expires_at"])
    if not expires_at.tzinfo:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    # Check attempts (max 5)
    if record.get("attempts", 0) >= 5:
        raise HTTPException(status_code=429, detail="Too many attempts. Please request a new OTP.")

    # Increment attempt count
    await db.password_reset_otps.update_one(
        {"mobile": data.mobile},
        {"$inc": {"attempts": 1}}
    )

    if record["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # OTP verified — generate reset token
    reset_token = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    await db.password_reset_otps.update_one(
        {"mobile": data.mobile},
        {"$set": {
            "verified": True,
            "reset_token": reset_token,
            "reset_token_expires": (now + timedelta(minutes=RESET_TOKEN_EXPIRY_MINUTES)).isoformat(),
        }}
    )

    return {"message": "OTP verified", "reset_token": reset_token}


@router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Step 3: Reset password using reset_token."""
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    record = await db.password_reset_otps.find_one(
        {"mobile": data.mobile, "reset_token": data.reset_token, "verified": True},
        {"_id": 0}
    )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    # Check reset token expiry
    token_expires = datetime.fromisoformat(record["reset_token_expires"])
    if not token_expires.tzinfo:
        token_expires = token_expires.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > token_expires:
        raise HTTPException(status_code=400, detail="Reset token has expired. Please start over.")

    # Update password
    now = datetime.now(timezone.utc).isoformat()
    result = await db.member_credentials.update_one(
        {"mobile": data.mobile},
        {"$set": {
            "password_hash": hash_password(data.new_password),
            "must_reset": False,
            "password_changed_at": now,
            "updated_at": now,
        }}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Credentials not found")

    # Clean up OTP record
    await db.password_reset_otps.delete_one({"mobile": data.mobile})

    return {"message": "Password reset successfully. Please login with your new password."}
