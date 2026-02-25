"""
Payment Reminders Routes
- Generate WhatsApp reminder links for pending payments
- Bulk reminder generation
- Template management
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
import uuid
import urllib.parse
from typing import Optional

from database import db
from deps import require_role
from models_payment import ReminderRequest, ReminderTemplate

router = APIRouter(prefix="/api")


# ===== DEFAULT TEMPLATES =====
DEFAULT_TEMPLATES = [
    {
        "template_id": "default_kitty",
        "name": "Kitty Reminder",
        "fee_type": "kitty",
        "message_template": (
            "Hi {name},\n\n"
            "Your *{chapter}* Kitty of *₹{amount}* for *{month}/{year}* is pending.\n\n"
            "Please pay via UPI: {upi_id}\n"
            "Or login to your member portal to submit payment.\n\n"
            "Thank you! 🙏"
        ),
    },
    {
        "template_id": "default_meeting_fee",
        "name": "Meeting Fee Reminder",
        "fee_type": "meeting_fee",
        "message_template": (
            "Hi {name},\n\n"
            "Your *{chapter}* Meeting Fee of *₹{amount}* for *{month}/{year}* is pending.\n\n"
            "Please pay at your earliest convenience.\n"
            "UPI: {upi_id}\n\n"
            "Thank you! 🙏"
        ),
    },
    {
        "template_id": "default_general",
        "name": "General Reminder",
        "fee_type": "general",
        "message_template": (
            "Hi {name},\n\n"
            "You have a pending payment of *₹{amount}* for *{chapter}*.\n\n"
            "Description: {description}\n"
            "Please clear at your earliest convenience.\n\n"
            "Thank you! 🙏"
        ),
    },
]

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]


def _build_wa_link(mobile, message):
    """Build WhatsApp deep link."""
    # Clean mobile
    phone = mobile.strip().replace(" ", "").replace("-", "")
    if not phone.startswith("91") and len(phone) == 10:
        phone = "91" + phone
    encoded = urllib.parse.quote(message)
    return f"https://wa.me/{phone}?text={encoded}"


# ===== GENERATE REMINDER FOR A SINGLE PAYMENT =====

@router.post("/admin/reminders/send")
async def send_reminder(data: ReminderRequest, user=Depends(require_role("admin"))):
    """Generate WhatsApp reminder links for specific members + fee."""
    chapter_id = user.get("chapter_id")

    # Get chapter info
    chapter = await db.chapters.find_one({"chapter_id": chapter_id}, {"_id": 0, "name": 1})
    chapter_name = chapter["name"] if chapter else "Chapter"

    # Get payment config for UPI ID
    sa = await db.chapters.find_one({"chapter_id": chapter_id}, {"_id": 0, "superadmin_id": 1})
    sa_id = sa.get("superadmin_id", "") if sa else ""
    config = await db.payment_config.find_one({"superadmin_id": sa_id}, {"_id": 0})
    upi_id = config.get("upi_id", "") if config else ""

    # Get template
    template_text = None
    if data.custom_message:
        template_text = data.custom_message
    else:
        # Load saved templates or use defaults
        fee_type = data.fee_type or "general"
        saved = await db.reminder_templates.find_one(
            {"chapter_id": chapter_id, "fee_type": fee_type},
            {"_id": 0}
        )
        if saved:
            template_text = saved.get("message_template", "")
        else:
            for t in DEFAULT_TEMPLATES:
                if t["fee_type"] == fee_type:
                    template_text = t["message_template"]
                    break
            if not template_text:
                template_text = DEFAULT_TEMPLATES[-1]["message_template"]  # general fallback

    links = []

    for mid in data.member_ids:
        member = await db.members.find_one(
            {"member_id": mid, "chapter_id": chapter_id},
            {"_id": 0, "full_name": 1, "primary_mobile": 1}
        )
        if not member:
            continue

        # Find pending fees for this member
        query = {"member_id": mid, "chapter_id": chapter_id, "status": "pending"}
        if data.fee_type:
            query["fee_type"] = data.fee_type
        if data.month:
            query["month"] = data.month
        if data.year:
            query["year"] = data.year

        fees = await db.fee_ledger.find(query, {"_id": 0}).to_list(50)

        total_amount = sum(f.get("amount", 0) for f in fees)
        if total_amount == 0 and fees:
            total_amount = fees[0].get("amount", 0)

        description = ", ".join(f.get("description", f.get("fee_type", "")) for f in fees[:3])
        if len(fees) > 3:
            description += f" (+{len(fees) - 3} more)"

        month_str = MONTH_NAMES[data.month] if data.month and 1 <= data.month <= 12 else ""
        year_str = str(data.year) if data.year else ""

        message = template_text.format(
            name=member.get("full_name", ""),
            chapter=chapter_name,
            amount=int(total_amount),
            month=month_str or "current",
            year=year_str or str(datetime.now().year),
            upi_id=upi_id,
            description=description,
        )

        wa_link = _build_wa_link(member.get("primary_mobile", ""), message)

        links.append({
            "member_id": mid,
            "member_name": member.get("full_name", ""),
            "mobile": member.get("primary_mobile", ""),
            "amount": total_amount,
            "fee_count": len(fees),
            "wa_link": wa_link,
            "message": message,
        })

    return {"links": links, "count": len(links)}


# ===== BULK REMINDERS =====

@router.post("/admin/reminders/bulk")
async def bulk_reminders(
    fee_type: Optional[str] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    user=Depends(require_role("admin")),
):
    """Generate reminder links for ALL members with pending fees."""
    chapter_id = user.get("chapter_id")

    query = {"chapter_id": chapter_id, "status": "pending"}
    if fee_type:
        query["fee_type"] = fee_type
    if month:
        query["month"] = month
    if year:
        query["year"] = year

    fees = await db.fee_ledger.find(query, {"_id": 0}).to_list(1000)

    # Group by member
    member_fees = {}
    for f in fees:
        mid = f["member_id"]
        if mid not in member_fees:
            member_fees[mid] = []
        member_fees[mid].append(f)

    # Use the send endpoint logic for each member
    request = ReminderRequest(
        member_ids=list(member_fees.keys()),
        fee_type=fee_type,
        month=month,
        year=year,
    )

    # Delegate to send_reminder by calling the same logic
    # (simpler to re-invoke)
    from fastapi import Request as FReq
    result = await send_reminder(request, user)
    return result


# ===== TEMPLATES =====

@router.get("/admin/reminders/templates")
async def get_templates(user=Depends(require_role("admin"))):
    """Return default and saved templates."""
    chapter_id = user.get("chapter_id")

    saved = await db.reminder_templates.find(
        {"chapter_id": chapter_id},
        {"_id": 0}
    ).to_list(50)

    # Merge defaults with saved
    saved_types = {t["fee_type"] for t in saved}
    templates = list(saved)
    for d in DEFAULT_TEMPLATES:
        if d["fee_type"] not in saved_types:
            templates.append(d)

    return templates


@router.post("/admin/reminders/templates")
async def save_template(data: ReminderTemplate, user=Depends(require_role("admin"))):
    """Save or update a reminder template."""
    chapter_id = user.get("chapter_id")

    template_id = data.template_id or str(uuid.uuid4())

    await db.reminder_templates.update_one(
        {"chapter_id": chapter_id, "fee_type": data.fee_type},
        {"$set": {
            "template_id": template_id,
            "chapter_id": chapter_id,
            "name": data.name,
            "fee_type": data.fee_type,
            "message_template": data.message_template,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        "$setOnInsert": {
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    return {"message": "Template saved", "template_id": template_id}
