"""
Member Portal Routes
- Member dashboard (pending count, total due)
- List/filter own fees
- Submit payment proof with file upload
- Payment info (UPI/bank details)
- UPI deep link generation
- Own profile, history
"""
from fastapi import APIRouter, HTTPException, Depends, Query, File, UploadFile, Form, Response
from datetime import datetime, timezone, timedelta
from typing import Optional
import urllib.parse

from database import db
from deps import require_role
from auth import create_access_token, verify_token, MEMBER_TOKEN_EXPIRE_DAYS
from file_storage import file_storage

router = APIRouter(prefix="/api")


# ===== TOKEN REFRESH =====

@router.post("/member/refresh-token")
async def refresh_token(user=Depends(require_role("member", "admin")), response: Response = None):
    """Refresh JWT if within 7 days of expiry. Returns new token + expires_at."""
    expires_at_str = user.get("expires_at")
    if not expires_at_str:
        raise HTTPException(status_code=400, detail="Token has no expiry info")

    expires_at = datetime.fromisoformat(expires_at_str)
    if not expires_at.tzinfo:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    days_left = (expires_at - now).total_seconds() / 86400

    if days_left > 7:
        return {"refreshed": False, "message": "Token still valid", "expires_at": expires_at_str}

    # Build new payload from existing claims
    new_payload = {
        "mobile": user.get("mobile"),
        "role": user.get("role"),
        "member_id": user.get("member_id"),
        "chapter_id": user.get("chapter_id"),
    }
    if user.get("chapter_role"):
        new_payload["chapter_role"] = user["chapter_role"]

    new_token, new_expires_at = create_access_token(new_payload)

    if response:
        response.set_cookie(
            key="access_token", value=new_token, httponly=True, samesite="lax",
            max_age=MEMBER_TOKEN_EXPIRE_DAYS * 86400, secure=False, path="/",
        )

    return {
        "refreshed": True,
        "token": new_token,
        "expires_at": new_expires_at,
    }


# ===== MEMBER DASHBOARD =====

@router.get("/member/dashboard")
async def member_dashboard(user=Depends(require_role("member", "admin"))):
    """Member home: profile snippet, pending count, total due, recent payments."""
    member_id = user.get("member_id")
    chapter_id = user.get("chapter_id")

    # Get member record
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Get chapter name
    chapter = await db.chapters.find_one({"chapter_id": chapter_id}, {"_id": 0, "name": 1})
    chapter_name = chapter["name"] if chapter else ""

    # Pending fees count + total
    pending_pipeline = [
        {"$match": {"member_id": member_id, "status": {"$in": ["pending", "rejected"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
    ]
    pending_result = await db.fee_ledger.aggregate(pending_pipeline).to_list(1)
    pending = pending_result[0] if pending_result else {"total": 0, "count": 0}

    # Submitted (in progress)
    submitted_pipeline = [
        {"$match": {"member_id": member_id, "status": {"$in": ["submitted", "admin_confirmed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
    ]
    submitted_result = await db.fee_ledger.aggregate(submitted_pipeline).to_list(1)
    submitted = submitted_result[0] if submitted_result else {"total": 0, "count": 0}

    # Paid this year
    current_year = datetime.now().year
    paid_pipeline = [
        {"$match": {"member_id": member_id, "status": "verified", "year": current_year}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
    ]
    paid_result = await db.fee_ledger.aggregate(paid_pipeline).to_list(1)
    paid = paid_result[0] if paid_result else {"total": 0, "count": 0}

    # Recent payments (last 5)
    recent = await db.fee_ledger.find(
        {"member_id": member_id, "status": {"$ne": "waived"}},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(5)

    # Next due
    next_due = await db.fee_ledger.find_one(
        {"member_id": member_id, "status": "pending"},
        {"_id": 0},
        sort=[("due_date", 1), ("created_at", 1)],
    )

    return {
        "member_name": member.get("full_name", ""),
        "chapter_name": chapter_name,
        "chapter_role": member.get("chapter_role", "member"),
        "member_id": member_id,
        "pending_count": pending.get("count", 0),
        "pending_total": pending.get("total", 0),
        "submitted_count": submitted.get("count", 0),
        "submitted_total": submitted.get("total", 0),
        "paid_this_year": paid.get("total", 0),
        "paid_count_this_year": paid.get("count", 0),
        "recent_payments": recent,
        "next_due": next_due,
    }


# ===== MEMBER FEES =====

@router.get("/member/fees")
async def member_list_fees(
    status: Optional[str] = Query(None),
    user=Depends(require_role("member", "admin")),
):
    """List all fees for the logged-in member."""
    member_id = user.get("member_id")
    query = {"member_id": member_id}

    if status:
        if status == "pending":
            query["status"] = {"$in": ["pending", "rejected"]}
        elif status == "in_progress":
            query["status"] = {"$in": ["submitted", "admin_confirmed"]}
        elif status == "completed":
            query["status"] = "verified"
        else:
            query["status"] = status

    fees = await db.fee_ledger.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return fees


@router.get("/member/fees/{ledger_id}")
async def member_fee_detail(ledger_id: str, user=Depends(require_role("member", "admin"))):
    """Get single fee detail for the member."""
    member_id = user.get("member_id")
    fee = await db.fee_ledger.find_one(
        {"ledger_id": ledger_id, "member_id": member_id},
        {"_id": 0}
    )
    if not fee:
        raise HTTPException(status_code=404, detail="Fee not found")
    return fee


# ===== SUBMIT PAYMENT PROOF =====

@router.post("/member/fees/{ledger_id}/submit-proof")
async def submit_payment_proof(
    ledger_id: str,
    payment_method: str = Form(...),
    utr_number: str = Form(None),
    payment_date: str = Form(None),
    note: str = Form(None),
    screenshot: UploadFile = File(None),
    user=Depends(require_role("member", "admin")),
):
    """
    Member submits payment proof.
    Status: pending -> submitted, or rejected -> submitted (resubmit).
    """
    member_id = user.get("member_id")
    fee = await db.fee_ledger.find_one(
        {"ledger_id": ledger_id, "member_id": member_id},
        {"_id": 0}
    )
    if not fee:
        raise HTTPException(status_code=404, detail="Fee not found")

    current_status = fee.get("status", "pending")
    if current_status not in ("pending", "rejected"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit proof for fee in status '{current_status}'"
        )

    # Save screenshot if provided
    proof_file = fee.get("proof_file")  # Keep old proof if resubmitting
    if screenshot and screenshot.filename:
        file_bytes = await screenshot.read()
        if len(file_bytes) > 0:
            proof_file = await file_storage.save(file_bytes, screenshot.filename, "payment_proofs")

    # Build timeline entry
    timeline = fee.get("timeline", [])
    timeline.append({
        "action": "submitted" if current_status == "pending" else "resubmitted",
        "by": user.get("mobile", ""),
        "role": "member",
        "at": datetime.now(timezone.utc).isoformat(),
        "note": note or f"Proof submitted via {payment_method}",
    })

    update_data = {
        "status": "submitted",
        "payment_method": payment_method,
        "utr_number": utr_number,
        "payment_date": payment_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "proof_file": proof_file,
        "timeline": timeline,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.fee_ledger.update_one(
        {"ledger_id": ledger_id},
        {"$set": update_data}
    )

    return {
        "message": "Payment proof submitted successfully",
        "ledger_id": ledger_id,
        "status": "submitted",
    }


# ===== PAYMENT INFO (UPI/Bank details) =====

@router.get("/member/payment-info")
async def member_payment_info(user=Depends(require_role("member", "admin"))):
    """Get chapter's UPI/bank payment details for the member."""
    chapter_id = user.get("chapter_id")

    # Find the chapter's ED (created_by)
    chapter = await db.chapters.find_one({"chapter_id": chapter_id}, {"_id": 0})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    created_by = chapter.get("created_by", "")
    payment_config = await db.payment_config.find_one(
        {"superadmin_id": created_by},
        {"_id": 0}
    )

    if not payment_config:
        return {
            "upi_id": None,
            "upi_holder_name": None,
            "bank_enabled": False,
            "bank_details": None,
            "require_screenshot": True,
            "require_utr": True,
        }

    bank_details = None
    if payment_config.get("bank_enabled"):
        bank_details = {
            "account_name": payment_config.get("bank_account_name"),
            "account_number": payment_config.get("bank_account_number"),
            "ifsc": payment_config.get("bank_ifsc"),
            "bank_name": payment_config.get("bank_name"),
            "branch": payment_config.get("bank_branch"),
        }

    return {
        "upi_id": payment_config.get("upi_id"),
        "upi_holder_name": payment_config.get("upi_holder_name"),
        "bank_enabled": payment_config.get("bank_enabled", False),
        "bank_details": bank_details,
        "require_screenshot": payment_config.get("require_screenshot", True),
        "require_utr": payment_config.get("require_utr", True),
        "gateway_enabled": payment_config.get("gateway_enabled", False),
    }


# ===== UPI DEEP LINK =====

@router.get("/member/upi-link/{ledger_id}")
async def generate_upi_link(ledger_id: str, user=Depends(require_role("member", "admin"))):
    """Generate UPI deep link for a fee."""
    member_id = user.get("member_id")
    chapter_id = user.get("chapter_id")

    fee = await db.fee_ledger.find_one(
        {"ledger_id": ledger_id, "member_id": member_id},
        {"_id": 0}
    )
    if not fee:
        raise HTTPException(status_code=404, detail="Fee not found")

    # Get payment config for UPI ID
    chapter = await db.chapters.find_one({"chapter_id": chapter_id}, {"_id": 0})
    created_by = chapter.get("created_by", "") if chapter else ""
    payment_config = await db.payment_config.find_one(
        {"superadmin_id": created_by},
        {"_id": 0}
    )

    upi_id = payment_config.get("upi_id") if payment_config else None
    if not upi_id:
        raise HTTPException(status_code=400, detail="UPI ID not configured")

    upi_name = payment_config.get("upi_holder_name", "Payment")
    amount = fee.get("amount", 0)
    description = fee.get("description", "Fee Payment")

    # Build UPI deep link
    params = {
        "pa": upi_id,
        "pn": upi_name,
        "am": str(amount),
        "tn": description,
        "cu": "INR",
    }
    upi_link = f"upi://pay?{urllib.parse.urlencode(params)}"

    return {
        "upi_link": upi_link,
        "upi_id": upi_id,
        "upi_holder_name": upi_name,
        "amount": amount,
        "description": description,
    }


# ===== MEMBER PROFILE =====

@router.get("/member/profile")
async def member_profile(user=Depends(require_role("member", "admin"))):
    """Get member's own profile."""
    member_id = user.get("member_id")
    member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    chapter = await db.chapters.find_one(
        {"chapter_id": member.get("chapter_id")},
        {"_id": 0, "name": 1}
    )

    member["chapter_name"] = chapter["name"] if chapter else ""

    # Attendance stats
    unique_member_id = member.get("unique_member_id", "")
    chapter_id_val = member.get("chapter_id", "")
    total_meetings = await db.meetings.count_documents({"chapter_id": chapter_id_val})
    attended = await db.attendance.count_documents({
        "unique_member_id": unique_member_id,
        "approval_status": "approved",
        "type": {"$in": ["member", "substitute"]},
    })
    member["attendance_total"] = total_meetings
    member["attendance_present"] = attended
    member["attendance_pct"] = round((attended / total_meetings) * 100) if total_meetings > 0 else 0

    return member


# ===== PAYMENT HISTORY =====

@router.get("/member/history")
async def member_history(user=Depends(require_role("member", "admin"))):
    """Get member's verified (completed) payment history."""
    member_id = user.get("member_id")
    payments = await db.fee_ledger.find(
        {"member_id": member_id, "status": "verified"},
        {"_id": 0}
    ).sort("payment_date", -1).to_list(100)
    return payments
