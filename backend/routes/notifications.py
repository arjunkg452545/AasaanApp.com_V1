"""In-app notification system: send, list, mark-read, unread-count, history."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Union
from datetime import datetime, timezone
from uuid import uuid4
from database import db
from deps import get_current_user, require_role

router = APIRouter(prefix="/api", tags=["notifications"])

# ── Models ──────────────────────────────────────────────

class SendNotificationRequest(BaseModel):
    type: str  # payment_reminder, meeting_schedule, custom
    title: str
    message: str
    recipients: Union[str, List[str]]  # "all", "pending", "role_holders", or list of member_ids
    channel: str = "in_app"

# ── Permission map: which roles can send which types ────

SEND_PERMISSIONS = {
    "president":           ["payment_reminder", "meeting_schedule", "custom"],
    "vice_president":      ["payment_reminder", "meeting_schedule", "custom"],
    "treasurer":           ["payment_reminder"],
    "secretary":           ["meeting_schedule", "custom"],
    "secretary_treasurer": ["payment_reminder", "meeting_schedule", "custom"],
    "lvh":                 ["custom"],
}

# ── POST /api/admin/notifications/send ──────────────────

@router.post("/admin/notifications/send")
async def send_notification(data: SendNotificationRequest, user=Depends(require_role("admin"))):
    chapter_id = user.get("chapter_id")
    if not chapter_id:
        raise HTTPException(status_code=400, detail="No chapter associated")

    chapter_role = user.get("chapter_role", "member")
    allowed_types = SEND_PERMISSIONS.get(chapter_role, [])
    if data.type not in allowed_types:
        raise HTTPException(status_code=403, detail=f"Your role ({chapter_role}) cannot send {data.type} notifications")

    # Resolve recipients
    member_filter = {"chapter_id": chapter_id, "status": "Active"}
    if isinstance(data.recipients, list):
        member_filter["member_id"] = {"$in": data.recipients}
    elif data.recipients == "pending":
        # Members with pending payments in fee_ledger
        pending_ids = await db.fee_ledger.distinct("member_id", {"chapter_id": chapter_id, "status": "pending"})
        if not pending_ids:
            raise HTTPException(status_code=400, detail="No members with pending payments")
        member_filter["member_id"] = {"$in": pending_ids}
    elif data.recipients == "role_holders":
        member_filter["chapter_role"] = {"$ne": "member"}
    # "all" → no extra filter

    members = await db.members.find(member_filter, {"member_id": 1}).to_list(5000)
    member_ids = [m["member_id"] for m in members]
    if not member_ids:
        raise HTTPException(status_code=400, detail="No recipients found")

    notification_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()

    notification = {
        "notification_id": notification_id,
        "chapter_id": chapter_id,
        "type": data.type,
        "title": data.title,
        "message": data.message,
        "sent_by": user.get("mobile", user.get("member_id", "")),
        "sent_by_name": user.get("member_name", "Admin"),
        "sent_by_role": chapter_role,
        "recipients": data.recipients if isinstance(data.recipients, str) else member_ids,
        "recipient_count": len(member_ids),
        "channel": data.channel,
        "created_at": now,
        "scheduled_at": None,
    }
    await db.notifications.insert_one(notification)

    # Create unread entries for each recipient
    read_docs = [
        {"member_id": mid, "notification_id": notification_id, "read_at": None}
        for mid in member_ids
    ]
    if read_docs:
        await db.notification_reads.insert_many(read_docs)

    return {"notification_id": notification_id, "recipient_count": len(member_ids)}

# ── GET /api/member/notifications ───────────────────────

@router.get("/member/notifications")
async def get_member_notifications(user=Depends(require_role("member", "admin"))):
    chapter_id = user.get("chapter_id")
    member_id = user.get("member_id")
    if not chapter_id or not member_id:
        raise HTTPException(status_code=400, detail="Missing chapter or member context")

    # Get notification_ids this member should see
    reads = await db.notification_reads.find(
        {"member_id": member_id}, {"notification_id": 1, "read_at": 1, "_id": 0}
    ).to_list(500)

    read_map = {r["notification_id"]: r["read_at"] for r in reads}
    noti_ids = list(read_map.keys())
    if not noti_ids:
        return []

    notifications = await db.notifications.find(
        {"notification_id": {"$in": noti_ids}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    result = []
    for n in notifications:
        result.append({
            "notification_id": n["notification_id"],
            "type": n.get("type", "custom"),
            "title": n.get("title", ""),
            "message": n.get("message", ""),
            "sent_by_name": n.get("sent_by_name", ""),
            "sent_by_role": n.get("sent_by_role", ""),
            "created_at": n.get("created_at", ""),
            "read": read_map.get(n["notification_id"]) is not None,
            "read_at": read_map.get(n["notification_id"]),
        })

    return result

# ── POST /api/member/notifications/{id}/read ────────────

@router.post("/member/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user=Depends(require_role("member", "admin"))):
    member_id = user.get("member_id")
    if not member_id:
        raise HTTPException(status_code=400, detail="Missing member context")

    result = await db.notification_reads.update_one(
        {"member_id": member_id, "notification_id": notification_id, "read_at": None},
        {"$set": {"read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "modified": result.modified_count > 0}

# ── GET /api/member/notifications/unread-count ──────────

@router.get("/member/notifications/unread-count")
async def get_unread_count(user=Depends(require_role("member", "admin"))):
    member_id = user.get("member_id")
    if not member_id:
        return {"count": 0}

    count = await db.notification_reads.count_documents(
        {"member_id": member_id, "read_at": None}
    )
    return {"count": count}

# ── GET /api/admin/notifications/history ────────────────

@router.get("/admin/notifications/history")
async def get_notification_history(user=Depends(require_role("admin"))):
    chapter_id = user.get("chapter_id")
    if not chapter_id:
        raise HTTPException(status_code=400, detail="No chapter associated")

    notifications = await db.notifications.find(
        {"chapter_id": chapter_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    result = []
    for n in notifications:
        noti_id = n["notification_id"]
        total_reads = await db.notification_reads.count_documents(
            {"notification_id": noti_id, "read_at": {"$ne": None}}
        )
        result.append({
            "notification_id": noti_id,
            "type": n.get("type", "custom"),
            "title": n.get("title", ""),
            "message": n.get("message", ""),
            "sent_by_name": n.get("sent_by_name", ""),
            "sent_by_role": n.get("sent_by_role", ""),
            "recipient_count": n.get("recipient_count", 0),
            "read_count": total_reads,
            "created_at": n.get("created_at", ""),
        })

    return result
