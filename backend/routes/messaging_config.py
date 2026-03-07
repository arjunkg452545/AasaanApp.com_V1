"""WhatsApp/SMS gateway configuration (placeholder) for developer dashboard."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone
from database import db
from deps import require_role

router = APIRouter(prefix="/api", tags=["messaging-config"])

DEFAULT_MESSAGING_CONFIG = {
    "config_id": "default",
    "whatsapp_enabled": False,
    "whatsapp_provider": "gupshup",
    "whatsapp_api_key": "",
    "whatsapp_phone_number_id": "",
    "whatsapp_business_id": "",
    "whatsapp_templates": {
        "payment_reminder": "",
        "meeting_schedule": "",
        "general": "",
    },
    "sms_enabled": False,
    "sms_provider": "msg91",
    "sms_api_key": "",
    "sms_sender_id": "AASAAN",
    "updated_at": "",
    "updated_by": "",
}

# ── Models ──────────────────────────────────────────────

class MessagingConfigUpdate(BaseModel):
    whatsapp_enabled: Optional[bool] = None
    whatsapp_provider: Optional[str] = None
    whatsapp_api_key: Optional[str] = None
    whatsapp_phone_number_id: Optional[str] = None
    whatsapp_business_id: Optional[str] = None
    whatsapp_templates: Optional[Dict[str, str]] = None
    sms_enabled: Optional[bool] = None
    sms_provider: Optional[str] = None
    sms_api_key: Optional[str] = None
    sms_sender_id: Optional[str] = None

class MessagingTestRequest(BaseModel):
    channel: str  # whatsapp or sms
    mobile: str
    message: str

# ── GET /api/developer/messaging-config ─────────────────

@router.get("/developer/messaging-config")
async def get_messaging_config(user=Depends(require_role("developer"))):
    config = await db.messaging_config.find_one({"config_id": "default"}, {"_id": 0})
    if not config:
        # Seed default
        config = {**DEFAULT_MESSAGING_CONFIG, "updated_at": datetime.now(timezone.utc).isoformat()}
        await db.messaging_config.insert_one(config)
        config.pop("_id", None)
    # Mask API keys for security
    safe = {**config}
    if safe.get("whatsapp_api_key"):
        safe["whatsapp_api_key"] = safe["whatsapp_api_key"][:4] + "****"
    if safe.get("sms_api_key"):
        safe["sms_api_key"] = safe["sms_api_key"][:4] + "****"
    return safe

# ── PUT /api/developer/messaging-config ─────────────────

@router.put("/developer/messaging-config")
async def update_messaging_config(data: MessagingConfigUpdate, user=Depends(require_role("developer"))):
    update_fields = {}
    for k, v in data.dict(exclude_unset=True).items():
        if v is not None or isinstance(v, bool):
            update_fields[k] = v

    if not update_fields:
        raise HTTPException(status_code=400, detail="No data to update")

    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_fields["updated_by"] = user.get("email", "")

    result = await db.messaging_config.update_one(
        {"config_id": "default"},
        {"$set": update_fields},
        upsert=True,
    )
    return {"message": "Messaging config updated", "modified": result.modified_count > 0}

# ── POST /api/developer/messaging-test ──────────────────

@router.post("/developer/messaging-test")
async def test_messaging(data: MessagingTestRequest, user=Depends(require_role("developer"))):
    """Placeholder: simulate sending a test message."""
    # Log the test attempt
    await db.messaging_logs.insert_one({
        "channel": data.channel,
        "mobile": data.mobile,
        "message": data.message,
        "status": "simulated",
        "sent_by": user.get("email", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"success": True, "message": f"Test {data.channel} sent (simulated) to {data.mobile}"}

# ── GET /api/developer/messaging-usage ──────────────────

@router.get("/developer/messaging-usage")
async def get_messaging_usage(user=Depends(require_role("developer"))):
    """Return usage stats from messaging_logs."""
    whatsapp_count = await db.messaging_logs.count_documents({"channel": "whatsapp"})
    sms_count = await db.messaging_logs.count_documents({"channel": "sms"})

    # Monthly breakdown (last 6 months)
    pipeline = [
        {"$group": {
            "_id": {"channel": "$channel", "month": {"$substr": ["$created_at", 0, 7]}},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id.month": -1}},
        {"$limit": 30},
    ]
    breakdown_raw = await db.messaging_logs.aggregate(pipeline).to_list(30)
    monthly_breakdown = [
        {"channel": b["_id"]["channel"], "month": b["_id"]["month"], "count": b["count"]}
        for b in breakdown_raw
    ]

    return {
        "whatsapp_count": whatsapp_count,
        "sms_count": sms_count,
        "monthly_breakdown": monthly_breakdown,
    }
