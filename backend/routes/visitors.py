"""Visitor registration and tracking for chapters."""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
import uuid
from typing import Optional

from database import db
from deps import require_role

router = APIRouter(prefix="/api", tags=["visitors"])


@router.post("/admin/visitors")
async def create_visitor(data: dict, user=Depends(require_role("admin"))):
    """Register a new visitor."""
    chapter_id = user.get("chapter_id")
    visitor_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    visitor = {
        "visitor_id": visitor_id,
        "chapter_id": chapter_id,
        "meeting_id": data.get("meeting_id"),
        "visitor_name": data.get("visitor_name", ""),
        "visitor_mobile": data.get("visitor_mobile", ""),
        "visitor_business": data.get("visitor_business", ""),
        "invited_by_member_id": data.get("invited_by_member_id"),
        "date": data.get("date", now[:10]),
        "status": data.get("status", "attended"),
        "notes": data.get("notes", ""),
        "created_at": now,
    }

    await db.visitors.insert_one(visitor)
    return {"message": "Visitor registered", "visitor_id": visitor_id}


@router.get("/admin/visitors")
async def list_visitors(
    status: Optional[str] = Query(None),
    user=Depends(require_role("admin")),
):
    """List all visitors for this chapter."""
    chapter_id = user.get("chapter_id")
    query = {"chapter_id": chapter_id}
    if status:
        query["status"] = status

    visitors = await db.visitors.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

    # Enrich with inviter name
    for v in visitors:
        if v.get("invited_by_member_id"):
            member = await db.members.find_one(
                {"member_id": v["invited_by_member_id"]},
                {"_id": 0, "full_name": 1}
            )
            v["invited_by_name"] = member.get("full_name", "") if member else ""

    return visitors


@router.put("/admin/visitors/{visitor_id}")
async def update_visitor(visitor_id: str, data: dict, user=Depends(require_role("admin"))):
    """Update visitor details or status."""
    chapter_id = user.get("chapter_id")
    update_data = {k: v for k, v in data.items() if k in (
        "visitor_name", "visitor_mobile", "visitor_business", "status", "notes",
        "invited_by_member_id", "meeting_id"
    )}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.visitors.update_one(
        {"visitor_id": visitor_id, "chapter_id": chapter_id},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Visitor not found")

    return {"message": "Visitor updated"}


@router.delete("/admin/visitors/{visitor_id}")
async def delete_visitor(visitor_id: str, user=Depends(require_role("admin"))):
    """Delete a visitor record."""
    chapter_id = user.get("chapter_id")
    result = await db.visitors.delete_one({"visitor_id": visitor_id, "chapter_id": chapter_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Visitor not found")

    return {"message": "Visitor deleted"}


@router.get("/admin/visitors/stats")
async def visitor_stats(user=Depends(require_role("admin"))):
    """Visitor statistics for the chapter."""
    chapter_id = user.get("chapter_id")
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    total = await db.visitors.count_documents({"chapter_id": chapter_id})
    this_month = await db.visitors.count_documents(
        {"chapter_id": chapter_id, "created_at": {"$gte": month_start}}
    )

    pipeline = [
        {"$match": {"chapter_id": chapter_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.visitors.aggregate(pipeline).to_list(None)

    attended = sum(r["count"] for r in status_counts if r["_id"] == "attended")
    interested = sum(r["count"] for r in status_counts if r["_id"] == "interested")
    joined = sum(r["count"] for r in status_counts if r["_id"] == "joined")
    conversion_rate = round((joined / total * 100), 1) if total > 0 else 0

    return {
        "total": total,
        "this_month": this_month,
        "attended": attended,
        "interested": interested,
        "joined": joined,
        "conversion_rate": conversion_rate,
    }
