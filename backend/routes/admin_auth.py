"""Unified admin/staff login endpoint.

Checks superadmins → accountant_credentials in sequence.
Chapter Admin login is handled via member login (President/VP get admin role).
"""

from fastapi import APIRouter, HTTPException, Response, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from database import db
from auth import create_access_token, verify_password, hash_password, STAFF_TOKEN_EXPIRE_DAYS
from deps import get_current_user, require_role
from models_payment import ForceResetPasswordRequest

router = APIRouter(prefix="/api")


class AdminLoginRequest(BaseModel):
    login_id: str
    password: str


class AdminLoginResponse(BaseModel):
    token: str
    role: str
    redirect: str
    expires_at: Optional[str] = None
    must_reset: bool = False
    # Role-specific fields (optional)
    mobile: Optional[str] = None
    chapter_id: Optional[str] = None
    chapter_name: Optional[str] = None
    accountant_id: Optional[str] = None
    name: Optional[str] = None
    superadmin_id: Optional[str] = None


@router.post("/auth/admin-login", response_model=AdminLoginResponse)
async def unified_admin_login(data: AdminLoginRequest, response: Response):
    """Staff login: tries superadmin → accountant. Chapter admins login via member login."""

    def _set_cookie(resp: Response, token: str, expire_days: int = STAFF_TOKEN_EXPIRE_DAYS):
        resp.set_cookie(
            key="access_token", value=token, httponly=True, samesite="lax",
            max_age=expire_days * 86400, secure=False, path="/",
        )

    # 1. Try superadmins collection
    sa = await db.superadmins.find_one({"mobile": data.login_id}, {"_id": 0})
    if sa and verify_password(data.password, sa.get("password_hash", "")):
        if sa.get("is_active") is False:
            raise HTTPException(status_code=403, detail="Account is deactivated. Contact developer admin.")
        token, expires_at = create_access_token({"mobile": data.login_id, "role": "superadmin"})
        _set_cookie(response, token)
        return AdminLoginResponse(
            token=token,
            role="superadmin",
            redirect="/superadmin/dashboard",
            mobile=data.login_id,
            expires_at=expires_at,
            must_reset=sa.get("must_reset", False),
        )

    # 2. Try accountant_credentials collection
    acc = await db.accountant_credentials.find_one({"mobile": data.login_id}, {"_id": 0})
    if acc and verify_password(data.password, acc.get("password_hash", "")):
        if not acc.get("is_active", True):
            raise HTTPException(status_code=403, detail="Account is deactivated")
        token, expires_at = create_access_token({
            "mobile": data.login_id,
            "role": "accountant",
            "accountant_id": acc["accountant_id"],
            "superadmin_id": acc["superadmin_id"],
        })
        _set_cookie(response, token)
        return AdminLoginResponse(
            token=token,
            role="accountant",
            redirect="/accountant/dashboard",
            mobile=data.login_id,
            accountant_id=acc["accountant_id"],
            name=acc.get("name", ""),
            superadmin_id=acc["superadmin_id"],
            expires_at=expires_at,
            must_reset=acc.get("must_reset", False),
        )

    # 3. None matched
    raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/auth/staff-force-reset")
async def staff_force_reset_password(
    data: ForceResetPasswordRequest,
    user=Depends(require_role("superadmin", "accountant")),
):
    """Staff (superadmin/accountant) resets password on first login (must_reset flow)."""
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    now = datetime.now(timezone.utc).isoformat()
    role = user.get("role")

    if role == "superadmin":
        result = await db.superadmins.update_one(
            {"mobile": user.get("mobile")},
            {"$set": {
                "password_hash": hash_password(data.new_password),
                "must_reset": False,
                "password_changed_at": now,
            }}
        )
    elif role == "accountant":
        result = await db.accountant_credentials.update_one(
            {"accountant_id": user.get("accountant_id")},
            {"$set": {
                "password_hash": hash_password(data.new_password),
                "must_reset": False,
                "password_changed_at": now,
                "updated_at": now,
            }}
        )
    else:
        raise HTTPException(status_code=403, detail="Forbidden")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Credentials not found")

    return {"message": "Password reset successfully"}


@router.post("/auth/logout")
async def logout(response: Response):
    """Clear the httpOnly JWT cookie."""
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Logged out successfully"}
