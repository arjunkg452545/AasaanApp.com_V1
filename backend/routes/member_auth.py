"""
Member Authentication Routes
- Member login (mobile + password)
- Admin sets member password
- Member changes own password
"""
from fastapi import APIRouter, HTTPException, Depends, Response
from datetime import datetime, timezone
import uuid

from database import db
from deps import get_current_user, require_role
from auth import create_access_token, hash_password, verify_password, ACCESS_TOKEN_EXPIRE_DAYS
from models_payment import (
    MemberLoginRequest,
    MemberLoginResponse,
    MemberSetPasswordRequest,
    MemberChangePasswordRequest,
)

router = APIRouter(prefix="/api")


# ===== MEMBER LOGIN =====
@router.post("/member/login", response_model=MemberLoginResponse)
async def member_login(data: MemberLoginRequest, response: Response):
    """Member login with mobile + password. Role determined by chapter_role.
    President/VP → admin (full), Secretary/Treasurer/LVH → admin (limited), Member → member.
    """
    # Look up credentials
    creds = await db.member_credentials.find_one({"mobile": data.mobile}, {"_id": 0})
    if not creds:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(data.password, creds["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not creds.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Get the member record for name, chapter_id, chapter_role, etc.
    member = await db.members.find_one(
        {"member_id": creds["member_id"]},
        {"_id": 0}
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member record not found")

    if member.get("membership_status") in ("suspended", "rejected"):
        raise HTTPException(status_code=403, detail="Your membership is suspended or rejected")

    if member.get("membership_status") == "pending":
        raise HTTPException(status_code=403, detail="Your account is pending approval")

    # Get chapter name
    chapter = await db.chapters.find_one(
        {"chapter_id": member["chapter_id"]},
        {"_id": 0, "name": 1}
    )
    chapter_name = chapter["name"] if chapter else ""

    # Determine JWT role based on chapter_role
    chapter_role = member.get("chapter_role", "member")
    if chapter_role in ("president", "vice_president"):
        jwt_role = "admin"
        redirect_url = "/admin/dashboard"
    elif chapter_role in ("secretary", "treasurer", "secretary_treasurer", "lvh"):
        jwt_role = "admin"
        redirect_url = "/admin/dashboard"
    else:
        jwt_role = "member"
        redirect_url = "/member/dashboard"

    # Create JWT with role-based payload
    jwt_payload = {
        "mobile": data.mobile,
        "role": jwt_role,
        "member_id": creds["member_id"],
        "chapter_id": member["chapter_id"],
    }
    if jwt_role == "admin":
        jwt_payload["chapter_role"] = chapter_role

    token = create_access_token(jwt_payload)

    response.set_cookie(
        key="access_token", value=token, httponly=True, samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 86400, secure=False, path="/",
    )

    return MemberLoginResponse(
        token=token,
        role=jwt_role,
        redirect=redirect_url,
        member_id=creds["member_id"],
        chapter_id=member["chapter_id"],
        member_name=member.get("full_name", ""),
        chapter_name=chapter_name,
        chapter_role=chapter_role,
    )


# ===== ADMIN: SET MEMBER PASSWORD =====
@router.post("/admin/members/{member_id}/set-password")
async def set_member_password(
    member_id: str,
    data: MemberSetPasswordRequest,
    user=Depends(require_role("admin", "superadmin")),
):
    """Admin/SuperAdmin sets or resets a member's login password."""
    # Verify member exists
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Authorization: admin can only set for their chapter
    if user["role"] == "admin" and member.get("chapter_id") != user.get("chapter_id"):
        raise HTTPException(status_code=403, detail="Not your chapter member")

    mobile = member["primary_mobile"]
    password_hash = hash_password(data.password)

    # Upsert into member_credentials
    await db.member_credentials.update_one(
        {"member_id": member_id},
        {"$set": {
            "member_id": member_id,
            "mobile": mobile,
            "password_hash": password_hash,
            "is_active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("mobile", ""),
        },
        "$setOnInsert": {
            "credential_id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    return {"message": "Password set successfully", "mobile": mobile}


# ===== MEMBER: CHANGE OWN PASSWORD =====
@router.post("/member/change-password")
async def change_member_password(
    data: MemberChangePasswordRequest,
    user=Depends(require_role("member")),
):
    """Member changes their own password."""
    member_id = user.get("member_id")
    creds = await db.member_credentials.find_one({"member_id": member_id}, {"_id": 0})
    if not creds:
        raise HTTPException(status_code=404, detail="Credentials not found")

    if not verify_password(data.current_password, creds["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    await db.member_credentials.update_one(
        {"member_id": member_id},
        {"$set": {
            "password_hash": hash_password(data.new_password),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    return {"message": "Password changed successfully"}
