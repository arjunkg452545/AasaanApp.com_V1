# MAX 400 LINES - Event payment endpoints
"""Fund management: event payments CRUD, mark/unmark, bulk operations."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from database import db
from deps import get_current_user
from models import EventCreate, EventPaymentCreate, EventUnmarkPayment, BulkMarkPayment, BulkUnmarkPayment
import pytz

IST = pytz.timezone('Asia/Kolkata')

router = APIRouter(prefix="/api", tags=["fund-events"])


@router.get("/admin/fund/events")
async def get_events(user=Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    events = await db.fund_events.find({"chapter_id": chapter_id}, {"_id": 0}).sort("created_at", -1).to_list(100)

    for event in events:
        if event["event_type"] == "compulsory":
            members_count = await db.members.count_documents({"chapter_id": chapter_id, "status": "Active"})
        else:
            members_count = await db.event_members.count_documents({"event_id": event["event_id"]})

        paid_count = await db.event_payments.count_documents({"event_id": event["event_id"], "status": "paid"})

        event["total_members"] = members_count
        event["paid_count"] = paid_count
        event["pending_count"] = members_count - paid_count
        event["total_collected"] = paid_count * event["amount"]

    return events


@router.post("/admin/fund/events")
async def create_event(data: EventCreate, user=Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    event_id = f"EV{datetime.now().strftime('%Y%m%d%H%M%S')}"
    event_data = {
        "event_id": event_id,
        "chapter_id": chapter_id,
        "event_name": data.event_name,
        "amount": data.amount,
        "event_date": data.event_date,
        "event_type": data.event_type,
        "description": data.description,
        "created_at": datetime.now(IST).isoformat()
    }
    await db.fund_events.insert_one(event_data)

    if data.event_type == "optional" and data.selected_members:
        for member_id in data.selected_members:
            await db.event_members.insert_one({
                "event_id": event_id,
                "member_id": member_id,
                "added_at": datetime.now(IST).isoformat()
            })

    return {"message": "Event created", "event_id": event_id}


@router.put("/admin/fund/events/{event_id}")
async def update_event(event_id: str, data: dict, user=Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    update_fields = {}
    if "event_name" in data:
        update_fields["event_name"] = data["event_name"]
    if "amount" in data:
        update_fields["amount"] = float(data["amount"])
    if "event_date" in data:
        update_fields["event_date"] = data["event_date"]
    if "description" in data:
        update_fields["description"] = data["description"]

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db.fund_events.update_one(
        {"event_id": event_id, "chapter_id": chapter_id}, {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event updated"}


@router.delete("/admin/fund/events/{event_id}")
async def delete_event(event_id: str, user=Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    result = await db.fund_events.delete_one({"event_id": event_id, "chapter_id": chapter_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    await db.event_payments.delete_many({"event_id": event_id})
    await db.event_members.delete_many({"event_id": event_id})
    return {"message": "Event deleted"}


@router.get("/admin/fund/events/{event_id}/members")
async def get_event_members(event_id: str, user=Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    event = await db.fund_events.find_one({"event_id": event_id, "chapter_id": chapter_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event["event_type"] == "compulsory":
        members = await db.members.find(
            {"chapter_id": chapter_id, "status": "Active"},
            {"_id": 0, "member_id": 1, "unique_member_id": 1, "full_name": 1}
        ).to_list(500)
    else:
        event_members = await db.event_members.find({"event_id": event_id}, {"_id": 0}).to_list(500)
        member_ids = [em["member_id"] for em in event_members]
        members = await db.members.find(
            {"chapter_id": chapter_id, "member_id": {"$in": member_ids}},
            {"_id": 0, "member_id": 1, "unique_member_id": 1, "full_name": 1}
        ).to_list(500)

    payments = await db.event_payments.find({"event_id": event_id}, {"_id": 0}).to_list(500)
    payment_map = {p["member_id"]: p for p in payments}

    result = []
    for member in members:
        payment = payment_map.get(member["member_id"])
        result.append({
            "member_id": member["member_id"],
            "unique_member_id": member["unique_member_id"],
            "member_name": member["full_name"],
            "amount": event["amount"],
            "status": payment["status"] if payment else "pending",
            "payment_mode": payment.get("payment_mode") if payment else None,
            "paid_date": payment.get("paid_date") if payment else None,
            "transaction_id": payment.get("transaction_id") if payment else None,
            "cheque_no": payment.get("cheque_no") if payment else None,
            "bank_name": payment.get("bank_name") if payment else None
        })

    result.sort(key=lambda x: (0 if x["status"] == "pending" else 1, x["member_name"].lower()))
    return {"event": event, "members": result}


@router.get("/admin/fund/events/payments")
async def get_all_event_payments(user=Depends(get_current_user)):
    """Get all event payments for the chapter"""
    chapter_id = user.get("chapter_id")
    events = await db.fund_events.find({"chapter_id": chapter_id}, {"_id": 0}).to_list(100)
    event_ids = [e["event_id"] for e in events]
    payments = await db.event_payments.find(
        {"event_id": {"$in": event_ids}}, {"_id": 0}
    ).to_list(5000)
    return payments


@router.post("/admin/fund/events/payment")
async def mark_event_payment(data: EventPaymentCreate, user=Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    event = await db.fund_events.find_one({"event_id": data.event_id, "chapter_id": chapter_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    payment_id = f"EP{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    payment_data = {
        "payment_id": payment_id,
        "event_id": data.event_id,
        "member_id": data.member_id,
        "payment_mode": data.payment_mode,
        "status": "paid",
        "paid_date": datetime.now(IST).isoformat(),
        "transaction_id": data.transaction_id,
        "cheque_no": data.cheque_no,
        "bank_name": data.bank_name
    }

    existing = await db.event_payments.find_one({
        "event_id": data.event_id, "member_id": data.member_id
    })

    if existing:
        await db.event_payments.update_one({"_id": existing["_id"]}, {"$set": payment_data})
    else:
        await db.event_payments.insert_one(payment_data)

    return {"message": "Payment recorded", "payment_id": payment_id}


@router.post("/admin/fund/events/unmark")
async def unmark_event_payment(data: EventUnmarkPayment, user=Depends(get_current_user)):
    result = await db.event_payments.delete_one({
        "event_id": data.event_id, "member_id": data.member_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"message": "Payment unmarked"}


@router.post("/admin/fund/events/bulk-mark")
async def bulk_mark_event(data: BulkMarkPayment, user=Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    event = await db.fund_events.find_one({"event_id": data.event_id, "chapter_id": chapter_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    marked_count = 0
    for member_id in data.member_ids:
        existing = await db.event_payments.find_one({
            "event_id": data.event_id, "member_id": member_id
        })
        if not existing:
            payment_data = {
                "payment_id": f"EP{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
                "event_id": data.event_id,
                "member_id": member_id,
                "payment_mode": data.payment_mode,
                "status": "paid",
                "paid_date": datetime.now(IST).isoformat()
            }
            await db.event_payments.insert_one(payment_data)
            marked_count += 1

    return {"message": f"{marked_count} payments marked"}


@router.post("/admin/fund/events/bulk-unmark")
async def bulk_unmark_event(data: BulkUnmarkPayment, user=Depends(get_current_user)):
    result = await db.event_payments.delete_many({
        "event_id": data.event_id,
        "member_id": {"$in": data.member_ids}
    })
    return {"message": f"{result.deleted_count} payments unmarked"}
