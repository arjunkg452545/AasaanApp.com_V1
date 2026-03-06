"""Unified admin login endpoint.

Checks superadmins → chapters (admin) → accountant_credentials in sequence,
returning the first match with its role-specific JWT and redirect URL.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from database import db
from auth import create_access_token, verify_password

router = APIRouter(prefix="/api")


class AdminLoginRequest(BaseModel):
    login_id: str
    password: str


class AdminLoginResponse(BaseModel):
    token: str
    role: str
    redirect: str
    # Role-specific fields (optional)
    mobile: Optional[str] = None
    chapter_id: Optional[str] = None
    chapter_name: Optional[str] = None
    accountant_id: Optional[str] = None
    name: Optional[str] = None
    superadmin_id: Optional[str] = None


@router.post("/auth/admin-login", response_model=AdminLoginResponse)
async def unified_admin_login(data: AdminLoginRequest):
    """Unified admin login: tries superadmin → chapter admin → accountant."""

    # 1. Try superadmins collection
    sa = await db.superadmins.find_one({"mobile": data.login_id}, {"_id": 0})
    if sa and verify_password(data.password, sa.get("password_hash", "")):
        if sa.get("is_active") is False:
            raise HTTPException(status_code=403, detail="Account is deactivated. Contact developer admin.")
        token = create_access_token({"mobile": data.login_id, "role": "superadmin"})
        return AdminLoginResponse(
            token=token,
            role="superadmin",
            redirect="/superadmin/dashboard",
            mobile=data.login_id,
        )

    # 2. Try chapters collection (chapter admin)
    chapter = await db.chapters.find_one({"admin_mobile": data.login_id}, {"_id": 0})
    if chapter and verify_password(data.password, chapter.get("admin_password_hash", "")):
        token = create_access_token({
            "mobile": data.login_id,
            "role": "admin",
            "chapter_id": chapter["chapter_id"],
            "chapter_name": chapter.get("name", ""),
        })
        return AdminLoginResponse(
            token=token,
            role="admin",
            redirect="/admin/dashboard",
            mobile=data.login_id,
            chapter_id=chapter["chapter_id"],
            chapter_name=chapter.get("name", ""),
        )

    # 3. Try accountant_credentials collection
    acc = await db.accountant_credentials.find_one({"mobile": data.login_id}, {"_id": 0})
    if acc and verify_password(data.password, acc.get("password_hash", "")):
        if not acc.get("is_active", True):
            raise HTTPException(status_code=403, detail="Account is deactivated")
        token = create_access_token({
            "mobile": data.login_id,
            "role": "accountant",
            "accountant_id": acc["accountant_id"],
            "superadmin_id": acc["superadmin_id"],
        })
        return AdminLoginResponse(
            token=token,
            role="accountant",
            redirect="/accountant/dashboard",
            mobile=data.login_id,
            accountant_id=acc["accountant_id"],
            name=acc.get("name", ""),
            superadmin_id=acc["superadmin_id"],
        )

    # 4. None matched
    raise HTTPException(status_code=401, detail="Invalid credentials")
