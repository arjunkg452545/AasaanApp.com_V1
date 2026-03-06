# MAX 400 LINES - Split into separate route files if exceeding
"""Fund management: meeting fee payment tracking."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from database import db
from deps import get_current_user
from models import BulkMarkPayment, BulkUnmarkPayment
import pytz

IST = pytz.timezone('Asia/Kolkata')

router = APIRouter(prefix="/api", tags=["fund-meetingfee"])

# ==================== MEETING FEES (Monthly like Kitty) ====================

# Meeting Fee Settings
@router.get("/admin/fund/meetingfee/settings")
async def get_meetingfee_settings(user = Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    settings = await db.meetingfee_settings.find({"chapter_id": chapter_id}, {"_id": 0}).to_list(100)
    return settings

@router.post("/admin/fund/meetingfee/settings")
async def set_meetingfee_amount(data: dict, user = Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    month = data.get("month")
    year = data.get("year")
    amount = data.get("amount")
    
    existing = await db.meetingfee_settings.find_one({
        "chapter_id": chapter_id, "month": month, "year": year
    })
    
    if existing:
        await db.meetingfee_settings.update_one(
            {"chapter_id": chapter_id, "month": month, "year": year},
            {"$set": {"amount": amount}}
        )
        return {"message": "Meeting fee amount updated", "setting_id": existing["setting_id"]}
    
    setting_id = f"MFS{datetime.now().strftime('%Y%m%d%H%M%S')}"
    setting_data = {
        "setting_id": setting_id,
        "chapter_id": chapter_id,
        "month": month,
        "year": year,
        "amount": amount,
        "created_at": datetime.now(IST).isoformat()
    }
    await db.meetingfee_settings.insert_one(setting_data)
    return {"message": "Meeting fee amount set", "setting_id": setting_id}

# Meeting Fee Payments List
@router.get("/admin/fund/meetingfee/payments")
async def get_meetingfee_payments(month: int = None, year: int = None, user = Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    
    members = await db.members.find(
        {"chapter_id": chapter_id, "status": "Active"},
        {"_id": 0, "member_id": 1, "unique_member_id": 1, "full_name": 1}
    ).to_list(500)
    
    query = {"chapter_id": chapter_id}
    if month: query["month"] = month
    if year: query["year"] = year
    
    setting = await db.meetingfee_settings.find_one(query, {"_id": 0})
    default_amount = setting["amount"] if setting else 0
    
    # Get individual member amounts (custom amounts)
    member_amounts = await db.member_amounts.find({
        "chapter_id": chapter_id,
        "month": month,
        "year": year,
        "type": "meetingfee"
    }, {"_id": 0}).to_list(500)
    member_amount_map = {ma["member_id"]: ma["amount"] for ma in member_amounts}
    
    result = []
    for member in members:
        payment = await db.meetingfee_payments.find_one({
            "chapter_id": chapter_id,
            "member_id": member["member_id"],
            "month": month,
            "year": year
        }, {"_id": 0})
        
        # Priority: payment amount > individual amount > default amount
        if payment:
            amount = payment.get("amount", default_amount)
        else:
            amount = member_amount_map.get(member["member_id"], default_amount)
        
        result.append({
            "member_id": member["member_id"],
            "member_name": member.get("full_name", ""),
            "unique_id": member.get("unique_member_id", ""),
            "month": month,
            "year": year,
            "amount": amount,
            "status": "paid" if payment else "pending",
            "paid_date": payment.get("paid_date") if payment else None,
            "payment_id": payment.get("payment_id") if payment else None,
            "payment_mode": payment.get("payment_mode") if payment else None
        })
    
    # Sort: pending first, then by name
    result.sort(key=lambda x: (0 if x["status"] == "pending" else 1, x["member_name"].lower()))
    return result

# Update individual member amount (for both pending and paid)
@router.put("/admin/fund/meetingfee/member-amount")
async def update_meetingfee_member_amount(data: dict, user = Depends(get_current_user)):
    """Update individual member's meeting fee amount for a specific month"""
    chapter_id = user.get("chapter_id")
    member_id = data.get("member_id")
    month = data.get("month")
    year = data.get("year")
    new_amount = data.get("amount")
    
    if not all([member_id, month, year, new_amount]):
        raise HTTPException(status_code=400, detail="member_id, month, year, and amount required")
    
    # Store/Update individual member amount
    await db.member_amounts.update_one(
        {
            "chapter_id": chapter_id,
            "member_id": member_id,
            "month": int(month),
            "year": int(year),
            "type": "meetingfee"
        },
        {
            "$set": {
                "amount": float(new_amount),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # Also update if payment already exists
    await db.meetingfee_payments.update_one(
        {
            "chapter_id": chapter_id,
            "member_id": member_id,
            "month": int(month),
            "year": int(year)
        },
        {"$set": {"amount": float(new_amount)}}
    )
    
    return {"message": "Amount updated"}

@router.get("/admin/fund/meetingfee/payments/all")
async def get_all_meetingfee_payments(user = Depends(get_current_user)):
    """Get all meeting fee payments with month/year info for reports"""
    chapter_id = user.get("chapter_id")
    payments = await db.meetingfee_payments.find(
        {"chapter_id": chapter_id, "status": "paid"},
        {"_id": 0}
    ).to_list(5000)
    return payments

# Meeting Fee Mark Payment
@router.post("/admin/fund/meetingfee/payments/mark")
async def mark_meetingfee_payment(data: dict, user = Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    member_id = data.get("member_id")
    month = data.get("month")
    year = data.get("year")
    custom_amount = data.get("amount")
    payment_mode = data.get("payment_mode", "Cash")  # Point 5: Payment mode
    
    existing = await db.meetingfee_payments.find_one({
        "chapter_id": chapter_id, "member_id": member_id, "month": month, "year": year
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Payment already marked")
    
    setting = await db.meetingfee_settings.find_one({"chapter_id": chapter_id, "month": month, "year": year})
    amount = custom_amount if custom_amount else (setting["amount"] if setting else 0)
    
    payment_id = f"MFP{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    payment_data = {
        "payment_id": payment_id,
        "chapter_id": chapter_id,
        "member_id": member_id,
        "month": month,
        "year": year,
        "amount": amount,
        "status": "paid",
        "payment_mode": payment_mode,  # Point 5: Payment mode
        "paid_date": datetime.now(IST).isoformat(),
        "received_by": user.get("mobile")
    }
    await db.meetingfee_payments.insert_one(payment_data)
    return {"message": "Payment marked", "payment_id": payment_id}

# Meeting Fee Unmark
@router.post("/admin/fund/meetingfee/payments/unmark")
async def unmark_meetingfee_payment(data: dict, user = Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    result = await db.meetingfee_payments.delete_one({
        "chapter_id": chapter_id,
        "member_id": data.get("member_id"),
        "month": data.get("month"),
        "year": data.get("year")
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"message": "Payment unmarked"}

# Meeting Fee Update Amount
@router.put("/admin/fund/meetingfee/payments/{payment_id}")
async def update_meetingfee_amount(payment_id: str, data: dict, user = Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    new_amount = data.get("amount")
    
    result = await db.meetingfee_payments.update_one(
        {"payment_id": payment_id, "chapter_id": chapter_id},
        {"$set": {"amount": new_amount}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"message": "Amount updated"}

# Meeting Fee Bulk Mark
@router.post("/admin/fund/meetingfee/payments/bulk-mark")
async def bulk_mark_meetingfee(data: dict, user = Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    member_ids = data.get("member_ids", [])
    month = data.get("month")
    year = data.get("year")
    
    setting = await db.meetingfee_settings.find_one({"chapter_id": chapter_id, "month": month, "year": year})
    amount = setting["amount"] if setting else 0
    
    marked_count = 0
    for member_id in member_ids:
        existing = await db.meetingfee_payments.find_one({
            "chapter_id": chapter_id, "member_id": member_id, "month": month, "year": year
        })
        if not existing:
            payment_id = f"MFP{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
            await db.meetingfee_payments.insert_one({
                "payment_id": payment_id,
                "chapter_id": chapter_id,
                "member_id": member_id,
                "month": month,
                "year": year,
                "amount": amount,
                "status": "paid",
                "paid_date": datetime.now(IST).isoformat(),
                "received_by": user.get("mobile")
            })
            marked_count += 1
    
    return {"message": f"{marked_count} payments marked"}

# Meeting Fee Bulk Unmark
@router.post("/admin/fund/meetingfee/payments/bulk-unmark")
async def bulk_unmark_meetingfee(data: dict, user = Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    result = await db.meetingfee_payments.delete_many({
        "chapter_id": chapter_id,
        "member_id": {"$in": data.get("member_ids", [])},
        "month": data.get("month"),
        "year": data.get("year")
    })
    return {"message": f"{result.deleted_count} payments unmarked"}

