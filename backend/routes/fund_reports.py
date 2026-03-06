# MAX 400 LINES - Fund report summary and quick view endpoints
"""Fund reports: summary, member report, quick view by date."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from typing import Optional
from database import db
from deps import get_current_user
import pytz

IST = pytz.timezone('Asia/Kolkata')

router = APIRouter(prefix="/api", tags=["fund-reports"])


@router.get("/admin/fund/reports/summary")
async def get_fund_summary(current_month: bool = True, user=Depends(get_current_user)):
    chapter_id = user.get("chapter_id")

    now = datetime.now(IST)
    current_month_num = now.month
    current_year = now.year

    month_start = datetime(current_year, current_month_num, 1)
    if current_month_num == 12:
        month_end = datetime(current_year + 1, 1, 1)
    else:
        month_end = datetime(current_year, current_month_num + 1, 1)

    if current_month:
        kitty_query = {"chapter_id": chapter_id, "status": "paid", "month": current_month_num, "year": current_year}
    else:
        kitty_query = {"chapter_id": chapter_id, "status": "paid"}

    kitty_payments = await db.kitty_payments.find(kitty_query, {"_id": 0, "amount": 1}).to_list(1000)
    kitty_total = sum(p["amount"] for p in kitty_payments)

    if current_month:
        meetingfee_query = {"chapter_id": chapter_id, "status": "paid", "month": current_month_num, "year": current_year}
    else:
        meetingfee_query = {"chapter_id": chapter_id, "status": "paid"}

    meetingfee_payments = await db.meetingfee_payments.find(meetingfee_query, {"_id": 0, "amount": 1}).to_list(1000)
    meetingfee_total = sum(p["amount"] for p in meetingfee_payments)

    event_total = 0
    if current_month:
        event_payments = await db.event_payments.find({
            "status": "paid", "paid_date": {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()}
        }, {"_id": 0, "event_id": 1}).to_list(1000)
    else:
        event_payments = await db.event_payments.find({"status": "paid"}, {"_id": 0, "event_id": 1}).to_list(1000)

    for payment in event_payments:
        event = await db.fund_events.find_one(
            {"event_id": payment["event_id"], "chapter_id": chapter_id}, {"_id": 0, "amount": 1}
        )
        if event:
            event_total += event["amount"]

    return {
        "kitty_total": kitty_total, "meetingfee_total": meetingfee_total,
        "event_total": event_total, "grand_total": kitty_total + meetingfee_total + event_total,
        "month": current_month_num, "year": current_year, "is_current_month": current_month
    }


@router.get("/admin/fund/reports/member/{member_id}")
async def get_member_fund_report(member_id: str, user=Depends(get_current_user)):
    chapter_id = user.get("chapter_id")
    member = await db.members.find_one({"member_id": member_id, "chapter_id": chapter_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    kitty_payments = await db.kitty_payments.find(
        {"chapter_id": chapter_id, "member_id": member_id}, {"_id": 0}
    ).to_list(100)

    misc_records = await db.misc_payment_records.find({"member_id": member_id}, {"_id": 0}).to_list(100)
    misc_payments = []
    for record in misc_records:
        payment = await db.misc_payments.find_one(
            {"misc_payment_id": record["misc_payment_id"], "chapter_id": chapter_id}, {"_id": 0}
        )
        if payment:
            misc_payments.append({**record, "payment_name": payment["payment_name"], "amount": payment["amount"]})

    event_records = await db.event_payments.find({"member_id": member_id}, {"_id": 0}).to_list(100)
    event_payments = []
    for record in event_records:
        event = await db.fund_events.find_one(
            {"event_id": record["event_id"], "chapter_id": chapter_id}, {"_id": 0}
        )
        if event:
            event_payments.append({**record, "event_name": event["event_name"], "amount": event["amount"]})

    kitty_total = sum(p["amount"] for p in kitty_payments if p["status"] == "paid")
    misc_total = sum(p["amount"] for p in misc_payments if p["status"] == "paid")
    event_total = sum(p["amount"] for p in event_payments if p["status"] == "paid")

    return {
        "member": member, "kitty_payments": kitty_payments,
        "misc_payments": misc_payments, "event_payments": event_payments,
        "totals": {"kitty": kitty_total, "misc": misc_total, "event": event_total,
                   "total": kitty_total + misc_total + event_total}
    }


@router.get("/admin/fund/quick-view")
async def get_payments_by_date(date: str = None, category: str = "kitty", user=Depends(get_current_user)):
    """Get all payments made on a specific date with month-wise breakdown"""
    chapter_id = user.get("chapter_id")

    if not date:
        now_ist = datetime.now(IST)
        date = now_ist.strftime("%Y-%m-%d")

    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    payments = []
    total_amount = 0
    month_breakdown = {}
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    if category in ("kitty", "meetingfee"):
        collection = db.kitty_payments if category == "kitty" else db.meetingfee_payments
        all_payments = await collection.find(
            {"chapter_id": chapter_id, "status": "paid"}, {"_id": 0}
        ).to_list(5000)

        for p in all_payments:
            paid_date = p.get("paid_date")
            if paid_date:
                try:
                    if isinstance(paid_date, str):
                        paid_dt = datetime.fromisoformat(paid_date.replace('Z', '+00:00'))
                        paid_date_only = paid_dt.astimezone(IST).date()
                    else:
                        paid_date_only = paid_date.date() if hasattr(paid_date, 'date') else paid_date

                    if paid_date_only == target_date:
                        member = await db.members.find_one({"member_id": p.get("member_id")}, {"_id": 0, "full_name": 1})
                        payment_month = p.get("month", 0)
                        payment_year = p.get("year", 0)
                        amount = p.get("amount", 0)

                        payments.append({
                            "member_name": member.get("full_name", "Unknown") if member else "Unknown",
                            "amount": amount, "paid_date": paid_date,
                            "for_month": payment_month, "for_year": payment_year
                        })
                        total_amount += amount

                        key = (payment_month, payment_year)
                        if key not in month_breakdown:
                            month_breakdown[key] = {"count": 0, "amount": 0, "month": payment_month, "year": payment_year}
                        month_breakdown[key]["count"] += 1
                        month_breakdown[key]["amount"] += amount
                except:
                    continue

    elif category == "events":
        all_payments = await db.event_payments.find(
            {"chapter_id": chapter_id, "status": "paid"}, {"_id": 0}
        ).to_list(5000)

        for p in all_payments:
            paid_date = p.get("paid_date")
            if paid_date:
                try:
                    if isinstance(paid_date, str):
                        paid_dt = datetime.fromisoformat(paid_date.replace('Z', '+00:00'))
                        paid_date_only = paid_dt.astimezone(IST).date()
                    else:
                        paid_date_only = paid_date.date() if hasattr(paid_date, 'date') else paid_date

                    if paid_date_only == target_date:
                        member = await db.members.find_one({"member_id": p.get("member_id")}, {"_id": 0, "full_name": 1})
                        event = await db.events.find_one({"event_id": p.get("event_id")}, {"_id": 0, "event_name": 1})
                        amount = p.get("amount", 0)
                        event_name = event.get("event_name", "Unknown Event") if event else "Unknown Event"

                        payments.append({
                            "member_name": member.get("full_name", "Unknown") if member else "Unknown",
                            "amount": amount, "event_name": event_name, "paid_date": paid_date
                        })
                        total_amount += amount

                        key = event_name
                        if key not in month_breakdown:
                            month_breakdown[key] = {"count": 0, "amount": 0, "event_name": event_name}
                        month_breakdown[key]["count"] += 1
                        month_breakdown[key]["amount"] += amount
                except:
                    continue

    if category == "events":
        breakdown_list = list(month_breakdown.values())
    else:
        breakdown_list = sorted(month_breakdown.values(), key=lambda x: (x.get("year", 0), x.get("month", 0)), reverse=True)
        for item in breakdown_list:
            if item.get("month") and item.get("month") > 0:
                item["month_name"] = month_names[item["month"] - 1]

    return {
        "date": date, "category": category, "payments": payments,
        "count": len(payments), "total_amount": total_amount, "month_breakdown": breakdown_list
    }
