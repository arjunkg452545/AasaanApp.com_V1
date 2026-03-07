"""
Admin Payment Verification Routes (Level 1)
- List submitted payments for chapter
- View payment detail with proof
- Confirm/reject payments
- Bulk confirm
- Manual cash/cheque entry
- Collection summary
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
import uuid
from typing import Optional

from database import db
from deps import require_role
from models_payment import AdminVerifyAction, AdminRejectAction, AdminBulkConfirm, AdminMarkCash

router = APIRouter(prefix="/api")


# ===== LIST SUBMITTED PAYMENTS =====

@router.get("/admin/payments/submitted")
async def list_submitted_payments(
    status: Optional[str] = Query("submitted"),
    fee_type: Optional[str] = Query(None),
    user=Depends(require_role("admin")),
):
    """List payments awaiting admin verification."""
    chapter_id = user.get("chapter_id")
    query = {"chapter_id": chapter_id}

    if status == "all":
        query["status"] = {"$in": ["submitted", "admin_confirmed", "rejected"]}
    elif status:
        query["status"] = status

    if fee_type:
        query["fee_type"] = fee_type

    payments = await db.fee_ledger.find(query, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return payments


# ===== PAYMENT DETAIL =====

@router.get("/admin/payments/{ledger_id}/detail")
async def payment_detail(ledger_id: str, user=Depends(require_role("admin"))):
    """Full payment detail with proof file URL."""
    chapter_id = user.get("chapter_id")
    payment = await db.fee_ledger.find_one(
        {"ledger_id": ledger_id, "chapter_id": chapter_id},
        {"_id": 0}
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Add proof URL if exists
    if payment.get("proof_file"):
        payment["proof_url"] = f"/uploads/{payment['proof_file']}"

    return payment


# ===== CONFIRM PAYMENT =====

@router.post("/admin/payments/{ledger_id}/confirm")
async def confirm_payment(
    ledger_id: str,
    data: AdminVerifyAction,
    user=Depends(require_role("admin")),
):
    """Admin confirms a submitted payment (submitted -> admin_confirmed)."""
    chapter_id = user.get("chapter_id")
    payment = await db.fee_ledger.find_one(
        {"ledger_id": ledger_id, "chapter_id": chapter_id},
        {"_id": 0}
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment["status"] != "submitted":
        raise HTTPException(status_code=400, detail=f"Cannot confirm from status '{payment['status']}'")

    timeline = payment.get("timeline", [])
    timeline.append({
        "action": "admin_confirmed",
        "by": user.get("mobile", ""),
        "role": "admin",
        "at": datetime.now(timezone.utc).isoformat(),
        "note": data.note or "Confirmed by chapter admin",
    })

    await db.fee_ledger.update_one(
        {"ledger_id": ledger_id},
        {"$set": {
            "status": "admin_confirmed",
            "timeline": timeline,
            "verified_by": user.get("mobile", ""),
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    return {"message": "Payment confirmed", "ledger_id": ledger_id}


# ===== REJECT PAYMENT =====

@router.post("/admin/payments/{ledger_id}/reject")
async def reject_payment(
    ledger_id: str,
    data: AdminRejectAction,
    user=Depends(require_role("admin")),
):
    """Admin rejects a submitted payment (submitted -> rejected)."""
    chapter_id = user.get("chapter_id")
    payment = await db.fee_ledger.find_one(
        {"ledger_id": ledger_id, "chapter_id": chapter_id},
        {"_id": 0}
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment["status"] not in ("submitted", "admin_confirmed"):
        raise HTTPException(status_code=400, detail=f"Cannot reject from status '{payment['status']}'")

    timeline = payment.get("timeline", [])
    timeline.append({
        "action": "rejected",
        "by": user.get("mobile", ""),
        "role": "admin",
        "at": datetime.now(timezone.utc).isoformat(),
        "note": data.reason,
    })

    await db.fee_ledger.update_one(
        {"ledger_id": ledger_id},
        {"$set": {
            "status": "rejected",
            "timeline": timeline,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    return {"message": "Payment rejected", "ledger_id": ledger_id}


# ===== BULK CONFIRM =====

@router.post("/admin/payments/bulk-confirm")
async def bulk_confirm_payments(data: AdminBulkConfirm, user=Depends(require_role("admin"))):
    """Bulk confirm multiple submitted payments."""
    chapter_id = user.get("chapter_id")
    confirmed = 0

    for lid in data.ledger_ids:
        payment = await db.fee_ledger.find_one(
            {"ledger_id": lid, "chapter_id": chapter_id, "status": "submitted"},
            {"_id": 0}
        )
        if not payment:
            continue

        timeline = payment.get("timeline", [])
        timeline.append({
            "action": "admin_confirmed",
            "by": user.get("mobile", ""),
            "role": "admin",
            "at": datetime.now(timezone.utc).isoformat(),
            "note": data.note or "Bulk confirmed",
        })

        await db.fee_ledger.update_one(
            {"ledger_id": lid},
            {"$set": {
                "status": "admin_confirmed",
                "timeline": timeline,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        confirmed += 1

    return {"message": f"Confirmed {confirmed} payments", "confirmed": confirmed}


# ===== MANUAL CASH/CHEQUE ENTRY =====

@router.post("/admin/payments/mark-cash")
async def mark_cash_payment(data: AdminMarkCash, user=Depends(require_role("admin"))):
    """
    Admin records a cash/cheque payment manually.
    If ledger_id is provided, updates existing entry.
    If not, creates a new entry at admin_confirmed status.
    """
    chapter_id = user.get("chapter_id")

    # Verify member belongs to chapter
    member = await db.members.find_one(
        {"member_id": data.member_id, "chapter_id": chapter_id},
        {"_id": 0}
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in your chapter")

    if data.ledger_id:
        # Update existing fee entry
        entry = await db.fee_ledger.find_one(
            {"ledger_id": data.ledger_id, "chapter_id": chapter_id},
            {"_id": 0}
        )
        if not entry:
            raise HTTPException(status_code=404, detail="Fee entry not found")

        timeline = entry.get("timeline", [])
        timeline.append({
            "action": "admin_confirmed",
            "by": user.get("mobile", ""),
            "role": "admin",
            "at": datetime.now(timezone.utc).isoformat(),
            "note": f"Manual {data.payment_method} entry. {data.note or ''}".strip(),
        })

        await db.fee_ledger.update_one(
            {"ledger_id": data.ledger_id},
            {"$set": {
                "status": "admin_confirmed",
                "payment_method": data.payment_method,
                "payment_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "timeline": timeline,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )

        return {"message": "Payment recorded", "ledger_id": data.ledger_id}
    else:
        # Create new entry
        ledger_id = str(uuid.uuid4())
        entry = {
            "ledger_id": ledger_id,
            "chapter_id": chapter_id,
            "member_id": data.member_id,
            "member_name": member.get("full_name", ""),
            "fee_type": data.fee_type or "cash_payment",
            "amount": data.amount,
            "month": data.month,
            "year": data.year,
            "due_date": None,
            "description": f"Manual {data.payment_method} - {data.note or 'Cash/Cheque payment'}",
            "status": "admin_confirmed",
            "payment_method": data.payment_method,
            "utr_number": data.cheque_number,
            "payment_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "proof_file": None,
            "timeline": [{
                "action": "created",
                "by": user.get("mobile", ""),
                "role": "admin",
                "at": datetime.now(timezone.utc).isoformat(),
                "note": f"Manual entry: {data.payment_method}",
            }, {
                "action": "admin_confirmed",
                "by": user.get("mobile", ""),
                "role": "admin",
                "at": datetime.now(timezone.utc).isoformat(),
                "note": f"Auto-confirmed manual {data.payment_method}. {data.note or ''}".strip(),
            }],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.fee_ledger.insert_one(entry)

        return {"message": "Cash payment recorded", "ledger_id": ledger_id}


# ===== COLLECTION SUMMARY =====

@router.get("/admin/payments/summary")
async def payment_summary(user=Depends(require_role("admin"))):
    """Collection stats for the chapter."""
    chapter_id = user.get("chapter_id")

    pipeline = [
        {"$match": {"chapter_id": chapter_id}},
        {"$group": {
            "_id": "$status",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1},
        }}
    ]

    results = await db.fee_ledger.aggregate(pipeline).to_list(None)

    summary = {
        "submitted_count": 0,
        "submitted_total": 0,
        "confirmed_count": 0,
        "confirmed_total": 0,
        "pending_count": 0,
        "pending_total": 0,
        "verified_count": 0,
        "verified_total": 0,
        "rejected_count": 0,
        "rejected_total": 0,
    }

    for r in results:
        s = r["_id"]
        if s == "submitted":
            summary["submitted_count"] = r["count"]
            summary["submitted_total"] = r["total"]
        elif s == "admin_confirmed":
            summary["confirmed_count"] = r["count"]
            summary["confirmed_total"] = r["total"]
        elif s == "pending":
            summary["pending_count"] = r["count"]
            summary["pending_total"] = r["total"]
        elif s == "verified":
            summary["verified_count"] = r["count"]
            summary["verified_total"] = r["total"]
        elif s == "rejected":
            summary["rejected_count"] = r["count"]
            summary["rejected_total"] = r["total"]

    return summary
