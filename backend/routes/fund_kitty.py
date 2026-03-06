# MAX 400 LINES - Split into separate route files if exceeding
"""Fund management: kitty payment tracking."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from database import db
from deps import get_current_user
from models import KittySettingCreate, KittyPaymentCreate, BulkMarkPayment, BulkUnmarkPayment
import pytz

IST = pytz.timezone('Asia/Kolkata')

router = APIRouter(prefix="/api", tags=["fund-kitty"])

# ===== FUND MANAGEMENT ENDPOINTS =====

# Kitty Settings
@router.get("/admin/fund/kitty/settings")
async def get_kitty_settings(user = Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    settings = await db.kitty_settings.find({"chapter_id": chapter_id}, {"_id": 0}).to_list(100)
    return settings

@router.post("/admin/fund/kitty/settings")
async def set_kitty_amount(data: KittySettingCreate, user = Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    
    # Check if setting already exists for this month/year
    existing = await db.kitty_settings.find_one({
        "chapter_id": chapter_id,
        "month": data.month,
        "year": data.year
    })
    
    if existing:
        # Update existing
        await db.kitty_settings.update_one(
            {"chapter_id": chapter_id, "month": data.month, "year": data.year},
            {"$set": {"amount": data.amount}}
        )
        return {"message": "Kitty amount updated", "setting_id": existing["setting_id"]}
    
    # Create new setting
    setting_id = f"KS{datetime.now().strftime('%Y%m%d%H%M%S')}"
    setting_data = {
        "setting_id": setting_id,
        "chapter_id": chapter_id,
        "month": data.month,
        "year": data.year,
        "amount": data.amount,
        "created_at": datetime.now(IST).isoformat()
    }
    await db.kitty_settings.insert_one(setting_data)
    return {"message": "Kitty amount set", "setting_id": setting_id}

# Kitty Payments
@router.get("/admin/fund/kitty/payments")
async def get_kitty_payments(month: int = None, year: int = None, user = Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    
    # Get all active members
    members = await db.members.find(
        {"chapter_id": chapter_id, "status": "Active"},
        {"_id": 0, "member_id": 1, "unique_member_id": 1, "full_name": 1}
    ).to_list(500)
    
    # Get kitty setting for the month (default/bulk amount)
    query = {"chapter_id": chapter_id}
    if month and year:
        query["month"] = month
        query["year"] = year
    
    setting = await db.kitty_settings.find_one(query, {"_id": 0})
    default_amount = setting["amount"] if setting else 0
    
    # Get individual member amounts (custom amounts)
    member_amounts = await db.member_amounts.find({
        "chapter_id": chapter_id,
        "month": month,
        "year": year,
        "type": "kitty"
    }, {"_id": 0}).to_list(500)
    member_amount_map = {ma["member_id"]: ma["amount"] for ma in member_amounts}
    
    # Get payments for the month
    payment_query = {"chapter_id": chapter_id}
    if month and year:
        payment_query["month"] = month
        payment_query["year"] = year
    
    payments = await db.kitty_payments.find(payment_query, {"_id": 0}).to_list(500)
    payment_map = {p["member_id"]: p for p in payments}
    
    # Build response with all members
    result = []
    for member in members:
        payment = payment_map.get(member["member_id"])
        # Priority: payment amount > individual amount > default amount
        if payment:
            amount = payment.get("amount", default_amount)
        else:
            amount = member_amount_map.get(member["member_id"], default_amount)
        
        result.append({
            "member_id": member["member_id"],
            "unique_member_id": member["unique_member_id"],
            "member_name": member["full_name"],
            "amount": amount,
            "status": payment["status"] if payment else "pending",
            "paid_date": payment.get("paid_date") if payment else None,
            "payment_id": payment.get("payment_id") if payment else None
        })
    
    # Sort: pending first, then by name
    result.sort(key=lambda x: (0 if x["status"] == "pending" else 1, x["member_name"].lower()))
    return result

@router.get("/admin/fund/kitty/payments/all")
async def get_all_kitty_payments(user = Depends(get_current_user)):
    """Get all kitty payments with month/year info for reports"""
    chapter_id = user.get("chapter_id")
    payments = await db.kitty_payments.find(
        {"chapter_id": chapter_id, "status": "paid"},
        {"_id": 0}
    ).to_list(5000)
    return payments

@router.post("/admin/fund/kitty/payments/mark")
async def mark_kitty_payment(data: KittyPaymentCreate, user = Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    
    # Get kitty amount for the month
    setting = await db.kitty_settings.find_one({
        "chapter_id": chapter_id,
        "month": data.month,
        "year": data.year
    })
    
    if not setting:
        raise HTTPException(status_code=400, detail="Kitty amount not set for this month")
    
    # Check if already paid
    existing = await db.kitty_payments.find_one({
        "chapter_id": chapter_id,
        "member_id": data.member_id,
        "month": data.month,
        "year": data.year
    })
    
    if existing and existing.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Already paid")
    
    payment_id = f"KP{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    payment_data = {
        "payment_id": payment_id,
        "chapter_id": chapter_id,
        "member_id": data.member_id,
        "month": data.month,
        "year": data.year,
        "amount": setting["amount"],
        "status": "paid",
        "paid_date": datetime.now(IST).isoformat(),
        "received_by": user.get("mobile")
    }
    
    if existing:
        await db.kitty_payments.update_one(
            {"_id": existing["_id"]},
            {"$set": payment_data}
        )
    else:
        await db.kitty_payments.insert_one(payment_data)
    
    return {"message": "Payment marked", "payment_id": payment_id}

# Kitty Unmark Payment
@router.post("/admin/fund/kitty/payments/unmark")
async def unmark_kitty_payment(data: KittyPaymentCreate, user = Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    
    result = await db.kitty_payments.delete_one({
        "chapter_id": chapter_id,
        "member_id": data.member_id,
        "month": data.month,
        "year": data.year
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {"message": "Payment unmarked"}

# Kitty Bulk Mark
@router.post("/admin/fund/kitty/payments/bulk-mark")
async def bulk_mark_kitty(data: BulkMarkPayment, user = Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    
    setting = await db.kitty_settings.find_one({
        "chapter_id": chapter_id,
        "month": data.month,
        "year": data.year
    })
    
    if not setting:
        raise HTTPException(status_code=400, detail="Kitty amount not set for this month")
    
    marked_count = 0
    for member_id in data.member_ids:
        existing = await db.kitty_payments.find_one({
            "chapter_id": chapter_id,
            "member_id": member_id,
            "month": data.month,
            "year": data.year,
            "status": "paid"
        })
        
        if not existing:
            payment_data = {
                "payment_id": f"KP{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
                "chapter_id": chapter_id,
                "member_id": member_id,
                "month": data.month,
                "year": data.year,
                "amount": setting["amount"],
                "status": "paid",
                "paid_date": datetime.now(IST).isoformat(),
                "received_by": user.get("mobile")
            }
            await db.kitty_payments.insert_one(payment_data)
            marked_count += 1
    
    return {"message": f"{marked_count} payments marked"}

# Kitty Update Payment Amount
@router.put("/admin/fund/kitty/payments/{payment_id}")
async def update_kitty_payment_amount(payment_id: str, data: dict, user = Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    new_amount = data.get("amount")
    
    if not new_amount:
        raise HTTPException(status_code=400, detail="Amount required")
    
    result = await db.kitty_payments.update_one(
        {"payment_id": payment_id, "chapter_id": chapter_id},
        {"$set": {"amount": float(new_amount)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {"message": "Amount updated"}

# Update individual member amount (for both pending and paid)
@router.put("/admin/fund/kitty/member-amount")
async def update_kitty_member_amount(data: dict, user = Depends(get_current_user)):
    """Update individual member's kitty amount for a specific month"""
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
            "type": "kitty"
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
    await db.kitty_payments.update_one(
        {
            "chapter_id": chapter_id,
            "member_id": member_id,
            "month": int(month),
            "year": int(year)
        },
        {"$set": {"amount": float(new_amount)}}
    )
    
    return {"message": "Amount updated"}

# Kitty Bulk Unmark
@router.post("/admin/fund/kitty/payments/bulk-unmark")
async def bulk_unmark_kitty(data: BulkUnmarkPayment, user = Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    
    result = await db.kitty_payments.delete_many({
        "chapter_id": chapter_id,
        "member_id": {"$in": data.member_ids},
        "month": data.month,
        "year": data.year
    })
    
    return {"message": f"{result.deleted_count} payments unmarked"}

