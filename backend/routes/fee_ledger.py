"""
Fee Ledger Routes
- Generate monthly fees (kitty + meeting fee) for all active members
- List/filter fees, summary, custom fee creation, waive
- Status flow enforcement with timeline tracking
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
import uuid
from typing import Optional

from database import db
from deps import get_current_user, require_role
from models_payment import FeeGenerateMonthly, FeeCustomCreate, FeeWaive

router = APIRouter(prefix="/api")

# Valid status transitions
VALID_TRANSITIONS = {
    "pending": ["submitted", "waived"],
    "submitted": ["admin_confirmed", "rejected"],
    "admin_confirmed": ["verified", "rejected"],
    "rejected": ["submitted"],  # member resubmits
    # "verified" and "waived" are terminal
}

MONTH_NAMES = {
    1: "January", 2: "February", 3: "March", 4: "April",
    5: "May", 6: "June", 7: "July", 8: "August",
    9: "September", 10: "October", 11: "November", 12: "December",
}


def add_timeline(entry: dict, action: str, by: str, role: str, note: str = ""):
    """Append to timeline array."""
    if "timeline" not in entry:
        entry["timeline"] = []
    entry["timeline"].append({
        "action": action,
        "by": by,
        "role": role,
        "at": datetime.now(timezone.utc).isoformat(),
        "note": note,
    })


# ===== GENERATE MONTHLY FEES =====

@router.post("/admin/fees/generate-monthly")
async def generate_monthly_fees(data: FeeGenerateMonthly, user=Depends(require_role("admin"))):
    """
    Generate fee entries for all ACTIVE members for given month/year.
    Idempotent: skips if entry already exists for member+month+year+fee_type.
    """
    chapter_id = user.get("chapter_id")
    if not chapter_id:
        raise HTTPException(status_code=400, detail="No chapter assigned")

    # Get chapter fee config
    fee_config = await db.chapter_fee_config.find_one({"chapter_id": chapter_id}, {"_id": 0})
    if not fee_config:
        # Fall back to ED defaults
        chapter = await db.chapters.find_one({"chapter_id": chapter_id}, {"_id": 0})
        created_by = chapter.get("created_by", "") if chapter else ""
        payment_config = await db.payment_config.find_one({"superadmin_id": created_by}, {"_id": 0})
        defaults = payment_config.get("default_fees", {}) if payment_config else {}
        fee_config = {
            "kitty_amount": defaults.get("kitty_amount", 0),
            "meeting_fee": defaults.get("meeting_fee", 0),
        }

    # Get all active members
    members = await db.members.find(
        {"chapter_id": chapter_id, "membership_status": "active"},
        {"_id": 0, "member_id": 1, "full_name": 1}
    ).to_list(None)

    if not members:
        return {"message": "No active members found", "created": 0}

    fee_amounts = {
        "kitty": fee_config.get("kitty_amount", 0),
        "meeting_fee": fee_config.get("meeting_fee", 0),
    }

    created_count = 0
    skipped_count = 0

    for fee_type in data.fee_types:
        amount = fee_amounts.get(fee_type, 0)
        if amount <= 0:
            continue

        for member in members:
            # Check if entry already exists (idempotent)
            existing = await db.fee_ledger.find_one({
                "chapter_id": chapter_id,
                "member_id": member["member_id"],
                "month": data.month,
                "year": data.year,
                "fee_type": fee_type,
            })

            if existing:
                skipped_count += 1
                continue

            entry = {
                "ledger_id": str(uuid.uuid4()),
                "chapter_id": chapter_id,
                "member_id": member["member_id"],
                "member_name": member.get("full_name", ""),
                "fee_type": fee_type,
                "amount": amount,
                "month": data.month,
                "year": data.year,
                "due_date": None,
                "description": f"{fee_type.replace('_', ' ').title()} - {MONTH_NAMES.get(data.month, '')} {data.year}",
                "status": "pending",
                "payment_method": None,
                "utr_number": None,
                "payment_date": None,
                "proof_file": None,
                "timeline": [{
                    "action": "created",
                    "by": user.get("mobile", ""),
                    "role": "admin",
                    "at": datetime.now(timezone.utc).isoformat(),
                    "note": "Auto-generated monthly fee",
                }],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.fee_ledger.insert_one(entry)
            created_count += 1

    return {
        "message": f"Generated {created_count} fee entries, skipped {skipped_count} existing",
        "created": created_count,
        "skipped": skipped_count,
    }


@router.post("/superadmin/fees/generate-all")
async def generate_all_fees(data: FeeGenerateMonthly, user=Depends(require_role("superadmin"))):
    """Bulk generate fees for all ED's chapters."""
    sa_mobile = user.get("mobile", "")
    chapters = await db.chapters.find(
        {"created_by": sa_mobile},
        {"_id": 0, "chapter_id": 1, "name": 1}
    ).to_list(None)

    total_created = 0
    total_skipped = 0
    results = []

    for ch in chapters:
        chapter_id = ch["chapter_id"]

        # Get fee config
        fee_config = await db.chapter_fee_config.find_one({"chapter_id": chapter_id}, {"_id": 0})
        if not fee_config:
            payment_config = await db.payment_config.find_one({"superadmin_id": sa_mobile}, {"_id": 0})
            defaults = payment_config.get("default_fees", {}) if payment_config else {}
            fee_config = {
                "kitty_amount": defaults.get("kitty_amount", 0),
                "meeting_fee": defaults.get("meeting_fee", 0),
            }

        members = await db.members.find(
            {"chapter_id": chapter_id, "membership_status": "active"},
            {"_id": 0, "member_id": 1, "full_name": 1}
        ).to_list(None)

        fee_amounts = {
            "kitty": fee_config.get("kitty_amount", 0),
            "meeting_fee": fee_config.get("meeting_fee", 0),
        }

        ch_created = 0
        for fee_type in data.fee_types:
            amount = fee_amounts.get(fee_type, 0)
            if amount <= 0:
                continue

            for member in members:
                existing = await db.fee_ledger.find_one({
                    "chapter_id": chapter_id,
                    "member_id": member["member_id"],
                    "month": data.month,
                    "year": data.year,
                    "fee_type": fee_type,
                })
                if existing:
                    total_skipped += 1
                    continue

                entry = {
                    "ledger_id": str(uuid.uuid4()),
                    "chapter_id": chapter_id,
                    "member_id": member["member_id"],
                    "member_name": member.get("full_name", ""),
                    "fee_type": fee_type,
                    "amount": amount,
                    "month": data.month,
                    "year": data.year,
                    "due_date": None,
                    "description": f"{fee_type.replace('_', ' ').title()} - {MONTH_NAMES.get(data.month, '')} {data.year}",
                    "status": "pending",
                    "payment_method": None,
                    "utr_number": None,
                    "payment_date": None,
                    "proof_file": None,
                    "timeline": [{
                        "action": "created",
                        "by": sa_mobile,
                        "role": "superadmin",
                        "at": datetime.now(timezone.utc).isoformat(),
                        "note": "Bulk generated by ED",
                    }],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
                await db.fee_ledger.insert_one(entry)
                ch_created += 1
                total_created += 1

        results.append({"chapter": ch["name"], "created": ch_created})

    return {
        "message": f"Generated {total_created} entries across {len(chapters)} chapters",
        "total_created": total_created,
        "total_skipped": total_skipped,
        "chapters": results,
    }


# ===== LIST / FILTER FEES =====

@router.get("/admin/fees")
async def list_fees(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    fee_type: Optional[str] = Query(None),
    member_id: Optional[str] = Query(None),
    user=Depends(require_role("admin")),
):
    """List fee ledger entries for the chapter with optional filters."""
    chapter_id = user.get("chapter_id")
    query = {"chapter_id": chapter_id}

    if month:
        query["month"] = month
    if year:
        query["year"] = year
    if status:
        query["status"] = status
    if fee_type:
        query["fee_type"] = fee_type
    if member_id:
        query["member_id"] = member_id

    fees = await db.fee_ledger.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return fees


@router.get("/admin/fees/summary")
async def fees_summary(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    user=Depends(require_role("admin")),
):
    """Aggregate fee summary for the chapter."""
    chapter_id = user.get("chapter_id")
    match_query = {"chapter_id": chapter_id}

    if month:
        match_query["month"] = month
    if year:
        match_query["year"] = year

    pipeline = [
        {"$match": match_query},
        {"$group": {
            "_id": "$status",
            "total_amount": {"$sum": "$amount"},
            "count": {"$sum": 1},
        }}
    ]

    results = await db.fee_ledger.aggregate(pipeline).to_list(None)

    summary = {
        "total_due": 0,
        "total_collected": 0,
        "total_pending": 0,
        "total_submitted": 0,
        "by_status": {},
    }

    for r in results:
        s = r["_id"]
        summary["by_status"][s] = {"amount": r["total_amount"], "count": r["count"]}
        if s == "verified":
            summary["total_collected"] += r["total_amount"]
        elif s in ("pending", "rejected"):
            summary["total_pending"] += r["total_amount"]
        elif s in ("submitted", "admin_confirmed"):
            summary["total_submitted"] += r["total_amount"]
        summary["total_due"] += r["total_amount"]

    # Also break down by fee_type
    type_pipeline = [
        {"$match": match_query},
        {"$group": {
            "_id": "$fee_type",
            "total_amount": {"$sum": "$amount"},
            "count": {"$sum": 1},
            "paid": {"$sum": {"$cond": [{"$eq": ["$status", "verified"]}, "$amount", 0]}},
        }}
    ]
    type_results = await db.fee_ledger.aggregate(type_pipeline).to_list(None)
    summary["by_fee_type"] = {r["_id"]: {"total": r["total_amount"], "count": r["count"], "paid": r["paid"]} for r in type_results}

    return summary


# ===== CUSTOM FEE =====

@router.post("/admin/fees/custom")
async def create_custom_fee(data: FeeCustomCreate, user=Depends(require_role("admin"))):
    """Create a custom one-time fee for one or more members."""
    chapter_id = user.get("chapter_id")
    created = 0

    for mid in data.member_ids:
        member = await db.members.find_one({"member_id": mid, "chapter_id": chapter_id}, {"_id": 0})
        if not member:
            continue

        entry = {
            "ledger_id": str(uuid.uuid4()),
            "chapter_id": chapter_id,
            "member_id": mid,
            "member_name": member.get("full_name", ""),
            "fee_type": data.fee_type,
            "amount": data.amount,
            "month": None,
            "year": None,
            "due_date": data.due_date,
            "description": data.description,
            "status": "pending",
            "payment_method": None,
            "utr_number": None,
            "payment_date": None,
            "proof_file": None,
            "timeline": [{
                "action": "created",
                "by": user.get("mobile", ""),
                "role": "admin",
                "at": datetime.now(timezone.utc).isoformat(),
                "note": f"Custom fee: {data.description}",
            }],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.fee_ledger.insert_one(entry)
        created += 1

    return {"message": f"Created {created} custom fee entries", "created": created}


# ===== WAIVE FEE =====

@router.post("/admin/fees/{ledger_id}/waive")
async def waive_fee(ledger_id: str, data: FeeWaive, user=Depends(require_role("admin"))):
    """Waive a fee (only from pending status)."""
    chapter_id = user.get("chapter_id")
    entry = await db.fee_ledger.find_one({"ledger_id": ledger_id, "chapter_id": chapter_id}, {"_id": 0})

    if not entry:
        raise HTTPException(status_code=404, detail="Fee entry not found")

    current_status = entry.get("status", "pending")
    if "waived" not in VALID_TRANSITIONS.get(current_status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot waive from status '{current_status}'"
        )

    timeline = entry.get("timeline", [])
    timeline.append({
        "action": "waived",
        "by": user.get("mobile", ""),
        "role": "admin",
        "at": datetime.now(timezone.utc).isoformat(),
        "note": data.reason,
    })

    await db.fee_ledger.update_one(
        {"ledger_id": ledger_id},
        {"$set": {
            "status": "waived",
            "timeline": timeline,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    return {"message": "Fee waived", "ledger_id": ledger_id}
