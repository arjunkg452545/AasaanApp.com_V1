"""
ED / Accountant Approval Routes (Level 2)
- ED creates/manages accountants
- Accountant login
- List admin_confirmed payments across ED's chapters
- Approve/reject individual or bulk
- Bank statement upload + auto-match
- Bridge to legacy collections on verify
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from datetime import datetime, timezone
import uuid
import csv
import io
from typing import Optional

from database import db
from deps import require_role
from auth import create_access_token, hash_password, verify_password
from models_payment import (
    AccountantCreate, AccountantLoginRequest, AccountantLoginResponse,
    BulkApproveRequest, BankStatementConfirm, AdminVerifyAction, AdminRejectAction,
)

router = APIRouter(prefix="/api")


# ===== HELPER: get superadmin_id from JWT mobile =====
async def _get_superadmin_id(user):
    """Resolve superadmin_id from JWT user payload."""
    mobile = user.get("mobile", "")
    sa = await db.superadmins.find_one({"mobile": mobile}, {"_id": 0})
    return sa.get("superadmin_id", mobile) if sa else mobile


# ===== HELPER: get all chapter_ids for this ED =====
async def _get_ed_chapter_ids(superadmin_id):
    """Get all chapter IDs belonging to this ED."""
    # Query by both created_by and superadmin_id for backward compatibility
    chapters = await db.chapters.find(
        {"$or": [{"created_by": superadmin_id}, {"superadmin_id": superadmin_id}]},
        {"chapter_id": 1, "_id": 0}
    ).to_list(500)
    return [c["chapter_id"] for c in chapters]


# ===== HELPER: bridge verified payment to legacy collections =====
async def _bridge_to_legacy(payment):
    """When a payment reaches 'verified', write to legacy collections for backward compat."""
    fee_type = payment.get("fee_type", "")
    chapter_id = payment.get("chapter_id", "")
    member_id = payment.get("member_id", "")

    # Get member info
    member = await db.members.find_one(
        {"member_id": member_id},
        {"_id": 0, "full_name": 1, "primary_mobile": 1}
    )
    member_name = member.get("full_name", "") if member else ""

    now = datetime.now(timezone.utc)

    if fee_type in ("kitty",):
        await db.kitty_payments.update_one(
            {"chapter_id": chapter_id, "member_id": member_id,
             "month": payment.get("month"), "year": payment.get("year")},
            {"$set": {
                "status": "paid",
                "amount": payment.get("amount", 0),
                "payment_date": now.strftime("%Y-%m-%d"),
                "member_name": member_name,
                "fee_ledger_id": payment.get("ledger_id"),
                "updated_at": now.isoformat(),
            }},
            upsert=True,
        )
    elif fee_type in ("meeting_fee",):
        await db.meetingfee_payments.update_one(
            {"chapter_id": chapter_id, "member_id": member_id,
             "month": payment.get("month"), "year": payment.get("year")},
            {"$set": {
                "status": "paid",
                "amount": payment.get("amount", 0),
                "payment_date": now.strftime("%Y-%m-%d"),
                "member_name": member_name,
                "fee_ledger_id": payment.get("ledger_id"),
                "updated_at": now.isoformat(),
            }},
            upsert=True,
        )
    # Other fee types: no legacy bridging needed for now


# ===== ACCOUNTANT MANAGEMENT (ED only) =====

@router.post("/superadmin/accountants")
async def create_accountant(data: AccountantCreate, user=Depends(require_role("superadmin"))):
    """ED creates an accountant."""
    sa_id = await _get_superadmin_id(user)

    # Check unique mobile
    existing = await db.accountant_credentials.find_one({"mobile": data.mobile})
    if existing:
        raise HTTPException(status_code=400, detail="Mobile already registered as accountant")

    accountant_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.accountant_credentials.insert_one({
        "accountant_id": accountant_id,
        "superadmin_id": sa_id,
        "name": data.name,
        "mobile": data.mobile,
        "email": data.email or "",
        "password_hash": hash_password(data.password),
        "must_reset": True,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    })

    return {"message": "Accountant created", "accountant_id": accountant_id}


@router.get("/superadmin/accountants")
async def list_accountants(user=Depends(require_role("superadmin"))):
    """List ED's accountants."""
    sa_id = await _get_superadmin_id(user)
    accountants = await db.accountant_credentials.find(
        {"superadmin_id": sa_id},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    return accountants


@router.delete("/superadmin/accountants/{accountant_id}")
async def deactivate_accountant(accountant_id: str, user=Depends(require_role("superadmin"))):
    """Deactivate an accountant."""
    sa_id = await _get_superadmin_id(user)
    result = await db.accountant_credentials.update_one(
        {"accountant_id": accountant_id, "superadmin_id": sa_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Accountant not found")
    return {"message": "Accountant deactivated"}


# ===== ACCOUNTANT LOGIN =====

@router.post("/accountant/login", response_model=AccountantLoginResponse)
async def accountant_login(data: AccountantLoginRequest):
    """Accountant login with mobile + password."""
    creds = await db.accountant_credentials.find_one({"mobile": data.mobile}, {"_id": 0})
    if not creds:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(data.password, creds["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not creds.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token, expires_at = create_access_token({
        "mobile": data.mobile,
        "role": "accountant",
        "accountant_id": creds["accountant_id"],
        "superadmin_id": creds["superadmin_id"],
    })

    return AccountantLoginResponse(
        token=token,
        role="accountant",
        accountant_id=creds["accountant_id"],
        name=creds.get("name", ""),
        superadmin_id=creds["superadmin_id"],
        expires_at=expires_at,
    )


# ===== LIST CONFIRMED PAYMENTS (for ED or Accountant) =====

@router.get("/verification/payments/confirmed")
async def list_confirmed_payments(
    chapter_id: Optional[str] = Query(None),
    fee_type: Optional[str] = Query(None),
    status: Optional[str] = Query("admin_confirmed"),
    user=Depends(require_role("superadmin", "accountant")),
):
    """List admin_confirmed payments across ED's chapters."""
    # Get superadmin_id based on role
    if user["role"] == "superadmin":
        sa_id = await _get_superadmin_id(user)
    else:
        sa_id = user.get("superadmin_id")

    chapter_ids = await _get_ed_chapter_ids(sa_id)
    if not chapter_ids:
        return []

    query = {"chapter_id": {"$in": chapter_ids}}

    if status == "all":
        query["status"] = {"$in": ["admin_confirmed", "verified", "rejected"]}
    elif status:
        query["status"] = status

    if chapter_id:
        query["chapter_id"] = chapter_id

    if fee_type:
        query["fee_type"] = fee_type

    payments = await db.fee_ledger.find(query, {"_id": 0}).sort("updated_at", -1).to_list(500)

    # Enrich with chapter name
    chapters_map = {}
    for ch_id in chapter_ids:
        ch = await db.chapters.find_one({"chapter_id": ch_id}, {"_id": 0, "name": 1})
        if ch:
            chapters_map[ch_id] = ch["name"]

    for p in payments:
        p["chapter_name"] = chapters_map.get(p.get("chapter_id"), "")

    return payments


# ===== APPROVE PAYMENT (admin_confirmed → verified) =====

@router.post("/verification/payments/{ledger_id}/approve")
async def approve_payment(
    ledger_id: str,
    data: AdminVerifyAction,
    user=Depends(require_role("superadmin", "accountant")),
):
    """Approve a payment (admin_confirmed → verified)."""
    if user["role"] == "superadmin":
        sa_id = await _get_superadmin_id(user)
    else:
        sa_id = user.get("superadmin_id")

    chapter_ids = await _get_ed_chapter_ids(sa_id)

    payment = await db.fee_ledger.find_one(
        {"ledger_id": ledger_id, "chapter_id": {"$in": chapter_ids}},
        {"_id": 0}
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment["status"] != "admin_confirmed":
        raise HTTPException(status_code=400, detail=f"Cannot approve from status '{payment['status']}'")

    role_label = "accountant" if user["role"] == "accountant" else "superadmin"
    timeline = payment.get("timeline", [])
    timeline.append({
        "action": "verified",
        "by": user.get("mobile", ""),
        "role": role_label,
        "at": datetime.now(timezone.utc).isoformat(),
        "note": data.note or f"Approved by {role_label}",
    })

    await db.fee_ledger.update_one(
        {"ledger_id": ledger_id},
        {"$set": {
            "status": "verified",
            "timeline": timeline,
            "approved_by": user.get("mobile", ""),
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    # Bridge to legacy collections
    payment["status"] = "verified"
    payment["timeline"] = timeline
    await _bridge_to_legacy(payment)

    return {"message": "Payment approved", "ledger_id": ledger_id}


# ===== REJECT FROM LEVEL 2 =====

@router.post("/verification/payments/{ledger_id}/reject")
async def reject_payment_l2(
    ledger_id: str,
    data: AdminRejectAction,
    user=Depends(require_role("superadmin", "accountant")),
):
    """Reject a payment from level 2 (admin_confirmed → rejected)."""
    if user["role"] == "superadmin":
        sa_id = await _get_superadmin_id(user)
    else:
        sa_id = user.get("superadmin_id")

    chapter_ids = await _get_ed_chapter_ids(sa_id)

    payment = await db.fee_ledger.find_one(
        {"ledger_id": ledger_id, "chapter_id": {"$in": chapter_ids}},
        {"_id": 0}
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment["status"] not in ("admin_confirmed", "submitted"):
        raise HTTPException(status_code=400, detail=f"Cannot reject from status '{payment['status']}'")

    role_label = "accountant" if user["role"] == "accountant" else "superadmin"
    timeline = payment.get("timeline", [])
    timeline.append({
        "action": "rejected",
        "by": user.get("mobile", ""),
        "role": role_label,
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


# ===== BULK APPROVE =====

@router.post("/verification/payments/bulk-approve")
async def bulk_approve_payments(data: BulkApproveRequest, user=Depends(require_role("superadmin", "accountant"))):
    """Bulk approve multiple admin_confirmed payments."""
    if user["role"] == "superadmin":
        sa_id = await _get_superadmin_id(user)
    else:
        sa_id = user.get("superadmin_id")

    chapter_ids = await _get_ed_chapter_ids(sa_id)
    approved = 0

    for lid in data.ledger_ids:
        payment = await db.fee_ledger.find_one(
            {"ledger_id": lid, "chapter_id": {"$in": chapter_ids}, "status": "admin_confirmed"},
            {"_id": 0}
        )
        if not payment:
            continue

        role_label = "accountant" if user["role"] == "accountant" else "superadmin"
        timeline = payment.get("timeline", [])
        timeline.append({
            "action": "verified",
            "by": user.get("mobile", ""),
            "role": role_label,
            "at": datetime.now(timezone.utc).isoformat(),
            "note": data.note or "Bulk approved",
        })

        await db.fee_ledger.update_one(
            {"ledger_id": lid},
            {"$set": {
                "status": "verified",
                "timeline": timeline,
                "approved_by": user.get("mobile", ""),
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )

        payment["status"] = "verified"
        payment["timeline"] = timeline
        await _bridge_to_legacy(payment)
        approved += 1

    return {"message": f"Approved {approved} payments", "approved": approved}


# ===== BANK STATEMENT UPLOAD + MATCH =====

@router.post("/verification/bank-statement/upload")
async def upload_bank_statement(
    file: UploadFile = File(...),
    user=Depends(require_role("superadmin", "accountant")),
):
    """Parse uploaded CSV bank statement and return potential matches."""
    if user["role"] == "superadmin":
        sa_id = await _get_superadmin_id(user)
    else:
        sa_id = user.get("superadmin_id")

    chapter_ids = await _get_ed_chapter_ids(sa_id)

    # Read file
    contents = await file.read()
    try:
        text = contents.decode("utf-8")
    except UnicodeDecodeError:
        text = contents.decode("latin-1")

    # Parse CSV
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    # Get all admin_confirmed payments for matching
    pending_payments = await db.fee_ledger.find(
        {"chapter_id": {"$in": chapter_ids}, "status": "admin_confirmed"},
        {"_id": 0}
    ).to_list(1000)

    # Build UTR lookup
    utr_map = {}
    for p in pending_payments:
        utr = p.get("utr_number", "")
        if utr:
            utr_map[utr.strip().lower()] = p

    # Try to match
    matches = []
    unmatched = []

    for row in rows:
        # Try common column names for UTR/reference
        ref = (row.get("UTR") or row.get("utr") or row.get("Reference") or
               row.get("reference") or row.get("Ref No") or row.get("Transaction ID") or
               row.get("txn_id") or "").strip()

        amount_str = (row.get("Amount") or row.get("amount") or
                      row.get("Credit") or row.get("credit") or "0").strip()
        try:
            amount = abs(float(amount_str.replace(",", "")))
        except (ValueError, TypeError):
            amount = 0

        date_str = row.get("Date") or row.get("date") or row.get("Transaction Date") or ""

        if ref and ref.lower() in utr_map:
            payment = utr_map[ref.lower()]
            matches.append({
                "ledger_id": payment["ledger_id"],
                "member_name": payment.get("member_name", ""),
                "fee_type": payment.get("fee_type", ""),
                "payment_amount": payment.get("amount", 0),
                "statement_amount": amount,
                "utr_number": ref,
                "date": date_str,
                "amount_match": abs(payment.get("amount", 0) - amount) < 1,
            })
        else:
            if ref or amount > 0:
                unmatched.append({
                    "utr_number": ref,
                    "amount": amount,
                    "date": date_str,
                })

    return {
        "total_rows": len(rows),
        "matched": len(matches),
        "unmatched": len(unmatched),
        "matches": matches,
        "unmatched_rows": unmatched[:50],  # Limit
    }


@router.post("/verification/bank-statement/confirm-matches")
async def confirm_statement_matches(
    data: BankStatementConfirm,
    user=Depends(require_role("superadmin", "accountant")),
):
    """Confirm matched bank statement entries → bulk verify."""
    if user["role"] == "superadmin":
        sa_id = await _get_superadmin_id(user)
    else:
        sa_id = user.get("superadmin_id")

    chapter_ids = await _get_ed_chapter_ids(sa_id)
    confirmed = 0

    for match in data.matches:
        payment = await db.fee_ledger.find_one(
            {"ledger_id": match.ledger_id, "chapter_id": {"$in": chapter_ids}, "status": "admin_confirmed"},
            {"_id": 0}
        )
        if not payment:
            continue

        role_label = "accountant" if user["role"] == "accountant" else "superadmin"
        timeline = payment.get("timeline", [])
        timeline.append({
            "action": "verified",
            "by": user.get("mobile", ""),
            "role": role_label,
            "at": datetime.now(timezone.utc).isoformat(),
            "note": f"Bank statement match - UTR: {match.utr_number}. {data.note or ''}".strip(),
        })

        await db.fee_ledger.update_one(
            {"ledger_id": match.ledger_id},
            {"$set": {
                "status": "verified",
                "timeline": timeline,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )

        payment["status"] = "verified"
        payment["timeline"] = timeline
        await _bridge_to_legacy(payment)
        confirmed += 1

    return {"message": f"Verified {confirmed} payments from bank statement", "confirmed": confirmed}


# ===== VERIFICATION SUMMARY =====

@router.get("/verification/payments/summary")
async def verification_summary(user=Depends(require_role("superadmin", "accountant"))):
    """Summary stats for the ED's chapters."""
    if user["role"] == "superadmin":
        sa_id = await _get_superadmin_id(user)
    else:
        sa_id = user.get("superadmin_id")

    chapter_ids = await _get_ed_chapter_ids(sa_id)

    pipeline = [
        {"$match": {"chapter_id": {"$in": chapter_ids}}},
        {"$group": {
            "_id": "$status",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1},
        }}
    ]
    results = await db.fee_ledger.aggregate(pipeline).to_list(None)

    summary = {
        "admin_confirmed_count": 0, "admin_confirmed_total": 0,
        "verified_count": 0, "verified_total": 0,
        "rejected_count": 0, "rejected_total": 0,
        "submitted_count": 0, "submitted_total": 0,
        "pending_count": 0, "pending_total": 0,
    }

    for r in results:
        s = r["_id"]
        if s == "admin_confirmed":
            summary["admin_confirmed_count"] = r["count"]
            summary["admin_confirmed_total"] = r["total"]
        elif s == "verified":
            summary["verified_count"] = r["count"]
            summary["verified_total"] = r["total"]
        elif s == "rejected":
            summary["rejected_count"] = r["count"]
            summary["rejected_total"] = r["total"]
        elif s == "submitted":
            summary["submitted_count"] = r["count"]
            summary["submitted_total"] = r["total"]
        elif s == "pending":
            summary["pending_count"] = r["count"]
            summary["pending_total"] = r["total"]

    return summary
