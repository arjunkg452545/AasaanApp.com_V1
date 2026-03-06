# MAX 400 LINES - Miscellaneous payment endpoints
"""Fund management: miscellaneous payments CRUD, mark/unmark, bulk operations."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from database import db
from deps import get_current_user
from models import MiscPaymentCreate, MiscPaymentRecordCreate, MiscUnmarkPayment, BulkMarkPayment, BulkUnmarkPayment
import pytz

IST = pytz.timezone('Asia/Kolkata')

router = APIRouter(prefix="/api", tags=["fund-misc"])


@router.get("/admin/fund/misc")
async def get_misc_payments(user=Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    payments = await db.misc_payments.find({"chapter_id": chapter_id}, {"_id": 0}).sort("created_at", -1).to_list(100)

    for payment in payments:
        records = await db.misc_payment_records.find(
            {"misc_payment_id": payment["misc_payment_id"]}, {"_id": 0}
        ).to_list(500)
        paid_count = len([r for r in records if r["status"] == "paid"])
        payment["paid_count"] = paid_count
        payment["total_collected"] = paid_count * payment["amount"]

    return payments


@router.post("/admin/fund/misc")
async def create_misc_payment(data: MiscPaymentCreate, user=Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    misc_payment_id = f"MP{datetime.now().strftime('%Y%m%d%H%M%S')}"
    payment_data = {
        "misc_payment_id": misc_payment_id,
        "chapter_id": chapter_id,
        "payment_name": data.payment_name,
        "amount": data.amount,
        "due_date": data.due_date,
        "description": data.description,
        "created_at": datetime.now(IST).isoformat()
    }
    await db.misc_payments.insert_one(payment_data)
    return {"message": "Payment created", "misc_payment_id": misc_payment_id}


@router.get("/admin/fund/misc/{misc_payment_id}/members")
async def get_misc_payment_members(misc_payment_id: str, user=Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    payment = await db.misc_payments.find_one({"misc_payment_id": misc_payment_id, "chapter_id": chapter_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    members = await db.members.find(
        {"chapter_id": chapter_id, "status": "Active"},
        {"_id": 0, "member_id": 1, "unique_member_id": 1, "full_name": 1}
    ).to_list(500)

    records = await db.misc_payment_records.find({"misc_payment_id": misc_payment_id}, {"_id": 0}).to_list(500)
    record_map = {r["member_id"]: r for r in records}

    result = []
    for member in members:
        record = record_map.get(member["member_id"])
        result.append({
            "member_id": member["member_id"],
            "unique_member_id": member["unique_member_id"],
            "member_name": member["full_name"],
            "amount": payment["amount"],
            "status": record["status"] if record else "pending",
            "payment_mode": record.get("payment_mode") if record else None,
            "paid_date": record.get("paid_date") if record else None,
            "transaction_id": record.get("transaction_id") if record else None,
            "cheque_no": record.get("cheque_no") if record else None,
            "bank_name": record.get("bank_name") if record else None
        })

    result.sort(key=lambda x: (0 if x["status"] == "pending" else 1, x["member_name"].lower()))
    return {"payment": payment, "members": result}


@router.post("/admin/fund/misc/record")
async def mark_misc_payment(data: MiscPaymentRecordCreate, user=Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    payment = await db.misc_payments.find_one({"misc_payment_id": data.misc_payment_id, "chapter_id": chapter_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    record_id = f"MR{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    record_data = {
        "record_id": record_id,
        "misc_payment_id": data.misc_payment_id,
        "member_id": data.member_id,
        "payment_mode": data.payment_mode,
        "status": "paid",
        "paid_date": datetime.now(IST).isoformat(),
        "transaction_id": data.transaction_id,
        "cheque_no": data.cheque_no,
        "bank_name": data.bank_name
    }

    existing = await db.misc_payment_records.find_one({
        "misc_payment_id": data.misc_payment_id, "member_id": data.member_id
    })

    if existing:
        await db.misc_payment_records.update_one({"_id": existing["_id"]}, {"$set": record_data})
    else:
        await db.misc_payment_records.insert_one(record_data)

    return {"message": "Payment recorded", "record_id": record_id}


@router.post("/admin/fund/misc/unmark")
async def unmark_misc_payment(data: MiscUnmarkPayment, user=Depends(get_current_user)):
    result = await db.misc_payment_records.delete_one({
        "misc_payment_id": data.misc_payment_id, "member_id": data.member_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"message": "Payment unmarked"}


@router.put("/admin/fund/misc/{misc_payment_id}")
async def update_misc_payment(misc_payment_id: str, data: dict, user=Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    update_fields = {}
    if "payment_name" in data:
        update_fields["payment_name"] = data["payment_name"]
    if "amount" in data:
        update_fields["amount"] = float(data["amount"])
    if "due_date" in data:
        update_fields["due_date"] = data["due_date"]
    if "description" in data:
        update_fields["description"] = data["description"]

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db.misc_payments.update_one(
        {"misc_payment_id": misc_payment_id, "chapter_id": chapter_id},
        {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"message": "Payment updated"}


@router.delete("/admin/fund/misc/{misc_payment_id}")
async def delete_misc_payment(misc_payment_id: str, user=Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    result = await db.misc_payments.delete_one({"misc_payment_id": misc_payment_id, "chapter_id": chapter_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    await db.misc_payment_records.delete_many({"misc_payment_id": misc_payment_id})
    return {"message": "Payment deleted"}


@router.post("/admin/fund/misc/bulk-mark")
async def bulk_mark_misc(data: BulkMarkPayment, user=Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    payment = await db.misc_payments.find_one({"misc_payment_id": data.payment_id, "chapter_id": chapter_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    marked_count = 0
    for member_id in data.member_ids:
        existing = await db.misc_payment_records.find_one({
            "misc_payment_id": data.payment_id, "member_id": member_id
        })
        if not existing:
            record_data = {
                "record_id": f"MR{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
                "misc_payment_id": data.payment_id,
                "member_id": member_id,
                "payment_mode": data.payment_mode,
                "status": "paid",
                "paid_date": datetime.now(IST).isoformat()
            }
            await db.misc_payment_records.insert_one(record_data)
            marked_count += 1

    return {"message": f"{marked_count} payments marked"}


@router.post("/admin/fund/misc/bulk-unmark")
async def bulk_unmark_misc(data: BulkUnmarkPayment, user=Depends(get_current_user)):
    result = await db.misc_payment_records.delete_many({
        "misc_payment_id": data.payment_id,
        "member_id": {"$in": data.member_ids}
    })
    return {"message": f"{result.deleted_count} payments unmarked"}
