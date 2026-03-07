"""SuperAdmin/ED reports: revenue and chapter health."""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from typing import Optional

from database import db
from deps import require_role

router = APIRouter(prefix="/api", tags=["superadmin-reports"])


async def _get_ed_info(user):
    """Get SA ID and chapter IDs for the ED."""
    mobile = user.get("mobile", "")
    sa = await db.superadmins.find_one({"mobile": mobile}, {"_id": 0})
    sa_id = sa.get("superadmin_id", mobile) if sa else mobile
    chapters = await db.chapters.find(
        {"$or": [{"created_by": sa_id}, {"created_by": mobile}, {"superadmin_id": sa_id}]},
        {"chapter_id": 1, "name": 1, "_id": 0}
    ).to_list(500)
    return sa_id, chapters


@router.get("/superadmin/reports/revenue")
async def revenue_report(user=Depends(require_role("superadmin"))):
    """Total revenue, by chapter, by month."""
    sa_id, chapters = await _get_ed_info(user)
    chapter_ids = [c["chapter_id"] for c in chapters]
    ch_names = {c["chapter_id"]: c.get("name", "") for c in chapters}

    if not chapter_ids:
        return {"total": 0, "by_chapter": [], "by_month": []}

    # Total collected
    pipeline_total = [
        {"$match": {"chapter_id": {"$in": chapter_ids}, "status": "verified"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    total_result = await db.fee_ledger.aggregate(pipeline_total).to_list(None)
    total = total_result[0]["total"] if total_result else 0
    total_count = total_result[0]["count"] if total_result else 0

    # By chapter
    pipeline_chapter = [
        {"$match": {"chapter_id": {"$in": chapter_ids}, "status": "verified"}},
        {"$group": {"_id": "$chapter_id", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    by_chapter_raw = await db.fee_ledger.aggregate(pipeline_chapter).to_list(None)
    by_chapter = [
        {"chapter_id": r["_id"], "chapter_name": ch_names.get(r["_id"], ""), "total": r["total"], "count": r["count"]}
        for r in by_chapter_raw
    ]

    # By month (last 12 months)
    pipeline_month = [
        {"$match": {"chapter_id": {"$in": chapter_ids}, "status": "verified"}},
        {"$group": {
            "_id": {"month": "$month", "year": "$year"},
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id.year": -1, "_id.month": -1}},
        {"$limit": 12}
    ]
    by_month_raw = await db.fee_ledger.aggregate(pipeline_month).to_list(None)
    by_month = [
        {"month": r["_id"].get("month"), "year": r["_id"].get("year"), "total": r["total"], "count": r["count"]}
        for r in by_month_raw if r["_id"].get("month")
    ]

    return {"total": total, "total_count": total_count, "by_chapter": by_chapter, "by_month": by_month}


@router.get("/superadmin/reports/chapter-health")
async def chapter_health(user=Depends(require_role("superadmin"))):
    """Per-chapter health metrics."""
    sa_id, chapters = await _get_ed_info(user)
    health_data = []

    for ch in chapters:
        cid = ch["chapter_id"]

        # Member count
        total_members = await db.members.count_documents(
            {"chapter_id": cid, "membership_status": "active", "archived": {"$ne": True}}
        )

        # Attendance rate (last 3 meetings)
        recent_meetings = await db.meetings.find(
            {"chapter_id": cid}, {"meeting_id": 1, "_id": 0}
        ).sort("date", -1).limit(3).to_list(3)

        attendance_pct = 0
        if recent_meetings and total_members > 0:
            meeting_ids = [m["meeting_id"] for m in recent_meetings]
            attended = await db.attendance.count_documents(
                {"meeting_id": {"$in": meeting_ids}, "status": {"$in": ["present", "late", "on_time"]}}
            )
            expected = total_members * len(recent_meetings)
            attendance_pct = round((attended / expected * 100), 1) if expected > 0 else 0

        # Collection rate
        total_fees = await db.fee_ledger.count_documents({"chapter_id": cid})
        collected_fees = await db.fee_ledger.count_documents({"chapter_id": cid, "status": "verified"})
        collection_pct = round((collected_fees / total_fees * 100), 1) if total_fees > 0 else 0

        # Health score
        score = (attendance_pct * 0.4) + (collection_pct * 0.6)
        if score >= 75:
            health = "green"
        elif score >= 50:
            health = "yellow"
        else:
            health = "red"

        health_data.append({
            "chapter_id": cid,
            "chapter_name": ch.get("name", ""),
            "members": total_members,
            "attendance_pct": attendance_pct,
            "collection_pct": collection_pct,
            "health_score": round(score, 1),
            "health": health,
        })

    return health_data
