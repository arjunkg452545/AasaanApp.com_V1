# MAX 400 LINES - SuperAdmin member approval endpoints
"""SuperAdmin member approval: pending list, approve, reject, transfer, cross-chapter view."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from database import db
from deps import get_current_user
from models import MemberApprovalAction, MemberTransfer

router = APIRouter(prefix="/api", tags=["superadmin-members"])


@router.get("/superadmin/members/pending")
async def get_pending_members(user=Depends(get_current_user)):
    """List all pending members across ED's chapters."""
    if user["role"] not in ("superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    if user["role"] == "developer":
        members = await db.members.find(
            {"membership_status": "pending"}, {"_id": 0}
        ).sort("created_at", -1).to_list(500)
    else:
        mobile = user.get("mobile", "")
        sa = await db.superadmins.find_one({"mobile": mobile}, {"_id": 0})
        sa_id = sa.get("superadmin_id", mobile) if sa else mobile
        # Query by both superadmin_id and mobile since created_by may use either
        chapters = await db.chapters.find(
            {"$or": [{"created_by": sa_id}, {"created_by": mobile}]},
            {"chapter_id": 1}
        ).to_list(100)
        chapter_ids = list({c["chapter_id"] for c in chapters})
        members = await db.members.find(
            {"chapter_id": {"$in": chapter_ids}, "membership_status": "pending"},
            {"_id": 0}
        ).sort("created_at", -1).to_list(500)

    for m in members:
        ch = await db.chapters.find_one({"chapter_id": m.get("chapter_id")}, {"_id": 0, "name": 1})
        m["chapter_name"] = ch.get("name") if ch else ""

    return members


@router.post("/superadmin/members/{member_id}/approve")
async def approve_member(member_id: str, user=Depends(get_current_user)):
    """Approve a pending member."""
    if user["role"] not in ("superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.get("membership_status") != "pending":
        raise HTTPException(status_code=400, detail="Member is not in pending status")

    history_entry = {
        "action": "approved",
        "from_status": "pending",
        "to_status": "active",
        "reason": "Approved by ED",
        "changed_by": user.get("mobile", user.get("email", "system")),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    await db.members.update_one(
        {"member_id": member_id},
        {
            "$set": {
                "membership_status": "active",
                "status": "Active",
            },
            "$push": {"status_history": history_entry}
        }
    )

    return {"message": "Member approved successfully"}


@router.post("/superadmin/members/{member_id}/reject")
async def reject_member(member_id: str, data: MemberApprovalAction, user=Depends(get_current_user)):
    """Reject a pending member."""
    if user["role"] not in ("superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.get("membership_status") != "pending":
        raise HTTPException(status_code=400, detail="Member is not in pending status")

    if not data.reason:
        raise HTTPException(status_code=400, detail="Reason is required for rejection")

    history_entry = {
        "action": "rejected",
        "from_status": "pending",
        "to_status": "rejected",
        "reason": data.reason,
        "changed_by": user.get("mobile", user.get("email", "system")),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    await db.members.update_one(
        {"member_id": member_id},
        {
            "$set": {
                "membership_status": "rejected",
                "status": "Inactive",
            },
            "$push": {"status_history": history_entry}
        }
    )

    return {"message": "Member rejected"}


@router.post("/superadmin/members/{member_id}/transfer")
async def transfer_member(member_id: str, data: MemberTransfer, user=Depends(get_current_user)):
    """Transfer member to a different chapter."""
    if user["role"] not in ("superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    target_ch = await db.chapters.find_one({"chapter_id": data.target_chapter_id}, {"_id": 0})
    if not target_ch:
        raise HTTPException(status_code=404, detail="Target chapter not found")

    old_chapter = member.get("chapter_id")

    history_entry = {
        "action": "transferred",
        "from_status": member.get("membership_status", "active"),
        "to_status": member.get("membership_status", "active"),
        "reason": data.reason or f"Transferred from chapter {old_chapter} to {data.target_chapter_id}",
        "changed_by": user.get("mobile", user.get("email", "system")),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    await db.members.update_one(
        {"member_id": member_id},
        {
            "$set": {
                "chapter_id": data.target_chapter_id,
                "organization_id": data.target_chapter_id,
                "transfer_from_chapter": old_chapter,
                "transfer_date": datetime.now(timezone.utc).isoformat(),
            },
            "$push": {"status_history": history_entry}
        }
    )

    return {"message": f"Member transferred to {target_ch.get('name', data.target_chapter_id)}"}


@router.get("/superadmin/members/all")
async def get_all_ed_members(
    search: str = "",
    status_filter: str = "",
    chapter_filter: str = "",
    user=Depends(get_current_user)
):
    """Cross-chapter member view for SuperAdmin/Developer."""
    if user["role"] not in ("superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    if user["role"] == "developer":
        base_filter = {}
    else:
        mobile = user.get("mobile", "")
        sa = await db.superadmins.find_one({"mobile": mobile}, {"_id": 0})
        sa_id = sa.get("superadmin_id", mobile) if sa else mobile
        # Query by both superadmin_id and mobile since created_by may use either
        chapters = await db.chapters.find(
            {"$or": [{"created_by": sa_id}, {"created_by": mobile}]},
            {"chapter_id": 1}
        ).to_list(100)
        chapter_ids = list({c["chapter_id"] for c in chapters})
        base_filter = {"chapter_id": {"$in": chapter_ids}}

    query = {**base_filter, "archived": {"$ne": True}}

    if status_filter:
        query["membership_status"] = status_filter
    if chapter_filter:
        query["chapter_id"] = chapter_filter
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"primary_mobile": {"$regex": search, "$options": "i"}},
            {"business_name": {"$regex": search, "$options": "i"}},
            {"unique_member_id": {"$regex": search, "$options": "i"}},
        ]

    members = await db.members.find(query, {"_id": 0}).sort("full_name", 1).to_list(2000)

    chapter_cache = {}
    for m in members:
        cid = m.get("chapter_id")
        if cid not in chapter_cache:
            ch = await db.chapters.find_one({"chapter_id": cid}, {"_id": 0, "name": 1})
            chapter_cache[cid] = ch.get("name") if ch else ""
        m["chapter_name"] = chapter_cache[cid]

    return members
