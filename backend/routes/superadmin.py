# MAX 400 LINES - SuperAdmin core endpoints
"""SuperAdmin endpoints: login, chapter CRUD, audit logs, subscription view, dashboard."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from database import db
from deps import get_current_user
from auth import create_access_token, verify_password, hash_password
from models import LoginRequest, LoginResponse, ChapterCreateEnhanced, ChapterResponse, UpdateCredentials, ChangeLeadershipRequest, List
import pytz

IST = pytz.timezone('Asia/Kolkata')

router = APIRouter(prefix="/api", tags=["superadmin"])


@router.post("/superadmin/login", response_model=LoginResponse)
async def superadmin_login(data: LoginRequest):
    admin = await db.superadmins.find_one({"mobile": data.mobile}, {"_id": 0})
    if not admin or not verify_password(data.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if admin.get("is_active") is False:
        raise HTTPException(status_code=403, detail="Account is deactivated. Contact developer admin.")

    token = create_access_token({"mobile": data.mobile, "role": "superadmin"})
    return LoginResponse(token=token, role="superadmin", mobile=data.mobile)


@router.post("/superadmin/chapters")
async def create_chapter(chapter: ChapterCreateEnhanced, user=Depends(get_current_user)):
    if user["role"] not in ("superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    if user["role"] == "superadmin":
        mobile = user.get("mobile", "")
        sa = await db.superadmins.find_one({"mobile": mobile}, {"_id": 0})
        sa_id = sa.get("superadmin_id", mobile) if sa else mobile

        sub = await db.subscriptions.find_one(
            {"superadmin_id": sa_id, "status": "active"}, {"_id": 0}, sort=[("end_date", -1)]
        )
        if not sub:
            raise HTTPException(status_code=403, detail="Please recharge to create chapters. No active subscription found.")

        end_dt = datetime.fromisoformat(sub["end_date"]) if isinstance(sub["end_date"], str) else sub["end_date"]
        if end_dt < datetime.now(timezone.utc):
            await db.subscriptions.update_one({"subscription_id": sub["subscription_id"]}, {"$set": {"status": "expired"}})
            raise HTTPException(status_code=403, detail="Your subscription has expired. Please recharge to create chapters.")

        chapters_used = await db.chapters.count_documents({"created_by": mobile})
        if chapters_used >= sub.get("chapters_allowed", 0):
            raise HTTPException(status_code=403, detail="Chapter limit reached. Please upgrade your subscription.")

    chapter_data = {
        "chapter_id": f"CH{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "name": chapter.name,
        "created_by": user.get("mobile", user.get("email", "")),
        "region": chapter.region, "state": chapter.state, "city": chapter.city,
        "status": "active", "audit_logs": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    # Legacy: if admin_mobile/password provided, store them for backward compatibility
    if chapter.admin_mobile:
        chapter_data["admin_mobile"] = chapter.admin_mobile
    if chapter.admin_password:
        chapter_data["admin_password_hash"] = hash_password(chapter.admin_password)

    await db.chapters.insert_one(chapter_data)
    return {k: v for k, v in chapter_data.items() if k not in ("admin_password_hash", "_id")}


@router.get("/superadmin/chapters", response_model=List[ChapterResponse])
async def get_all_chapters(user=Depends(get_current_user)):
    if user["role"] not in ("superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")
    chapters = await db.chapters.find({}, {"_id": 0, "admin_password_hash": 0}).to_list(1000)
    return chapters


@router.put("/superadmin/chapters/{chapter_id}/credentials")
async def update_chapter_credentials(chapter_id: str, data: UpdateCredentials, user=Depends(get_current_user)):
    if user["role"] not in ("superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    new_password_hash = hash_password(data.new_password)
    audit_log = {
        "changed_by": user["mobile"],
        "changed_at": datetime.now(timezone.utc).isoformat(),
        "new_mobile": data.new_mobile
    }
    result = await db.chapters.update_one(
        {"chapter_id": chapter_id},
        {"$set": {"admin_mobile": data.new_mobile, "admin_password_hash": new_password_hash},
         "$push": {"audit_logs": audit_log}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return {"message": "Credentials updated successfully"}


@router.put("/superadmin/chapters/{chapter_id}/deactivate")
async def deactivate_chapter(chapter_id: str, user=Depends(get_current_user)):
    """Soft deactivate a chapter — sets status to 'inactive'. All data preserved."""
    if user["role"] not in ("superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    chapter = await db.chapters.find_one({"chapter_id": chapter_id}, {"_id": 0})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    new_status = "active" if (chapter.get("status") or "").lower() == "inactive" else "inactive"
    await db.chapters.update_one(
        {"chapter_id": chapter_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Chapter {'reactivated' if new_status == 'active' else 'deactivated'} successfully", "new_status": new_status}


@router.get("/superadmin/chapters/{chapter_id}/audit-logs")
async def get_audit_logs(chapter_id: str, user=Depends(get_current_user)):
    if user["role"] not in ("superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    chapter = await db.chapters.find_one({"chapter_id": chapter_id}, {"_id": 0, "audit_logs": 1})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    return {"audit_logs": chapter.get("audit_logs", [])}


# ===== SUPERADMIN SUBSCRIPTION + DASHBOARD ENDPOINTS =====

@router.get("/superadmin/my-subscription")
async def get_my_subscription(user=Depends(get_current_user)):
    """Returns current subscription for the logged-in ED"""
    if user["role"] not in ("superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    mobile = user.get("mobile", "")
    sa = await db.superadmins.find_one({"mobile": mobile}, {"_id": 0})
    if not sa:
        return {"subscription": None, "days_remaining": 0, "chapters_used": 0, "chapters_allowed": 0}

    sa_id = sa.get("superadmin_id", mobile)
    sub = await db.subscriptions.find_one(
        {"superadmin_id": sa_id, "status": "active"}, {"_id": 0}, sort=[("end_date", -1)]
    )
    if not sub:
        sub = await db.subscriptions.find_one(
            {"superadmin_id": sa_id}, {"_id": 0}, sort=[("end_date", -1)]
        )

    chapters_used = await db.chapters.count_documents({"created_by": mobile})
    chapters_allowed = sub.get("chapters_allowed", 0) if sub else 0

    if sub:
        end_dt = datetime.fromisoformat(sub["end_date"]) if isinstance(sub["end_date"], str) else sub["end_date"]
        days_remaining = max(0, (end_dt - datetime.now(timezone.utc)).days)
        if days_remaining == 0 and sub.get("status") == "active":
            await db.subscriptions.update_one(
                {"subscription_id": sub["subscription_id"]}, {"$set": {"status": "expired"}}
            )
            sub["status"] = "expired"
    else:
        days_remaining = 0

    return {
        "subscription": sub, "days_remaining": days_remaining,
        "chapters_used": chapters_used, "chapters_allowed": chapters_allowed
    }


@router.get("/superadmin/dashboard/stats")
async def superadmin_dashboard_stats(user=Depends(get_current_user)):
    """Dashboard stats for SuperAdmin"""
    if user["role"] not in ("superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    mobile = user.get("mobile", "")
    my_chapters = await db.chapters.find({"created_by": mobile}, {"_id": 0}).to_list(1000)
    chapter_ids = [ch["chapter_id"] for ch in my_chapters]

    total_chapters = len(my_chapters)
    active_chapters = sum(1 for ch in my_chapters if ch.get("status", "active") == "active")
    inactive_chapters = total_chapters - active_chapters
    total_members = await db.members.count_documents({"chapter_id": {"$in": chapter_ids}, "status": "Active"}) if chapter_ids else 0
    pending_members = await db.members.count_documents({"chapter_id": {"$in": chapter_ids}, "membership_status": "pending"}) if chapter_ids else 0

    now = datetime.now(IST)
    current_month = now.month
    current_year = now.year

    kitty_pipeline = [
        {"$match": {"chapter_id": {"$in": chapter_ids}, "status": "paid", "month": current_month, "year": current_year}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    kitty_sum = await db.kitty_payments.aggregate(kitty_pipeline).to_list(1) if chapter_ids else []

    mf_pipeline = [
        {"$match": {"chapter_id": {"$in": chapter_ids}, "status": "paid", "month": current_month, "year": current_year}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    mf_sum = await db.meetingfee_payments.aggregate(mf_pipeline).to_list(1) if chapter_ids else []

    this_month_collection = (
        (kitty_sum[0]["total"] if kitty_sum else 0) +
        (mf_sum[0]["total"] if mf_sum else 0)
    )

    return {
        "total_chapters": total_chapters, "active_chapters": active_chapters,
        "inactive_chapters": inactive_chapters, "pending_members": pending_members,
        "total_members": total_members, "this_month_collection": this_month_collection
    }


@router.get("/superadmin/chapters/overview")
async def superadmin_chapters_overview(user=Depends(get_current_user)):
    """All chapters with member_count, last_meeting_date"""
    if user["role"] not in ("superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    mobile = user.get("mobile", "")
    chapters = await db.chapters.find({"created_by": mobile}, {"_id": 0, "admin_password_hash": 0}).to_list(1000)

    result = []
    for ch in chapters:
        cid = ch["chapter_id"]
        member_count = await db.members.count_documents({"chapter_id": cid, "status": "Active"})
        last_meeting = await db.meetings.find_one(
            {"chapter_id": cid}, {"_id": 0, "date": 1, "meeting_id": 1}, sort=[("date", -1)]
        )
        # Get current president
        president = await db.members.find_one(
            {"chapter_id": cid, "chapter_role": "president", "membership_status": "active"},
            {"_id": 0, "full_name": 1, "primary_mobile": 1, "member_id": 1}
        )
        admin_name = president.get("full_name", "No President") if president else "No President"

        result.append({
            **ch, "member_count": member_count,
            "last_meeting_date": last_meeting.get("date", "") if last_meeting else "",
            "admin_name": admin_name,
            "president": president,
        })

    return result


# ===== CHAPTER LEADERSHIP MANAGEMENT =====

@router.post("/superadmin/chapters/{chapter_id}/change-leadership")
async def change_chapter_leadership(chapter_id: str, data: ChangeLeadershipRequest, user=Depends(get_current_user)):
    """ED assigns or changes leadership (president/VP) for a chapter."""
    if user["role"] not in ("superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    if data.role not in ("president", "vice_president"):
        raise HTTPException(status_code=400, detail="Role must be 'president' or 'vice_president'")

    # Verify chapter exists and belongs to this ED
    chapter = await db.chapters.find_one({"chapter_id": chapter_id}, {"_id": 0})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    # Verify member exists and belongs to this chapter
    member = await db.members.find_one(
        {"member_id": data.member_id, "chapter_id": chapter_id},
        {"_id": 0, "full_name": 1, "member_id": 1}
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in this chapter")

    # Remove role from previous holder
    previous_holder = None
    existing = await db.members.find_one(
        {"chapter_id": chapter_id, "chapter_role": data.role, "member_id": {"$ne": data.member_id}},
        {"_id": 0, "full_name": 1, "member_id": 1}
    )
    if existing:
        previous_holder = existing.get("full_name", "Unknown")
        await db.members.update_one(
            {"member_id": existing["member_id"]},
            {"$set": {"chapter_role": "member"}}
        )

    # Assign new role
    await db.members.update_one(
        {"member_id": data.member_id},
        {"$set": {"chapter_role": data.role}}
    )

    # Audit log
    await db.chapters.update_one(
        {"chapter_id": chapter_id},
        {"$push": {"audit_logs": {
            "changed_by": user.get("mobile", user.get("email", "")),
            "changed_at": datetime.now(timezone.utc).isoformat(),
            "action": "leadership_change",
            "new_role": data.role,
            "new_holder": member.get("full_name", ""),
            "previous_holder": previous_holder,
        }}}
    )

    msg = f"{member.get('full_name', '')} is now {data.role.replace('_', ' ').title()}"
    if previous_holder:
        msg += f". Previous holder {previous_holder} has been set to 'member'."

    return {"message": msg, "previous_holder": previous_holder}


@router.get("/superadmin/chapters/{chapter_id}/leadership")
async def get_chapter_leadership(chapter_id: str, user=Depends(get_current_user)):
    """Get current leadership for a chapter."""
    if user["role"] not in ("superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    leaders = await db.members.find(
        {"chapter_id": chapter_id, "chapter_role": {"$ne": "member"}, "membership_status": "active"},
        {"_id": 0, "member_id": 1, "full_name": 1, "primary_mobile": 1, "chapter_role": 1}
    ).to_list(20)

    all_members = await db.members.find(
        {"chapter_id": chapter_id, "membership_status": "active"},
        {"_id": 0, "member_id": 1, "full_name": 1, "primary_mobile": 1, "chapter_role": 1}
    ).sort("full_name", 1).to_list(2000)

    return {"leaders": leaders, "members": all_members}
