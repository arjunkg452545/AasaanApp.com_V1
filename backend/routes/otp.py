"""
OTP endpoints:
- POST /api/otp/send (public)
- POST /api/otp/verify (public)
- GET /api/developer/otp-config (developer only)
- PUT /api/developer/otp-config (developer only)
- POST /api/developer/otp-test (developer only)
- GET /api/developer/otp-usage (developer only)
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from database import db
from deps import require_role
from otp_service import otp_service

router = APIRouter(prefix="/api", tags=["otp"])


# ===== Request Models =====

class OTPSendRequest(BaseModel):
    mobile: str

class OTPVerifyRequest(BaseModel):
    mobile: str
    otp: str

class OTPConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    provider: Optional[str] = None
    api_key: Optional[str] = None
    sender_id: Optional[str] = None
    template_id: Optional[str] = None
    otp_length: Optional[int] = None
    expiry_minutes: Optional[int] = None
    daily_limit_per_number: Optional[int] = None
    template_text: Optional[str] = None

class OTPTestRequest(BaseModel):
    mobile: str


# ===== Public OTP Endpoints =====

@router.post("/otp/send")
async def send_otp(data: OTPSendRequest, request: Request):
    """Send OTP to mobile number. No auth required."""
    ip = request.client.host if request.client else ""
    result = await otp_service.send_otp(data.mobile, ip_address=ip)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to send OTP"))
    return {"message": "OTP sent", "expires_in": result.get("expires_in", 300)}


@router.post("/otp/verify")
async def verify_otp(data: OTPVerifyRequest):
    """Verify OTP. Does NOT log in — just verifies. No auth required."""
    result = await otp_service.verify_otp(data.mobile, data.otp)
    if not result.get("verified"):
        raise HTTPException(status_code=400, detail=result.get("error", "Verification failed"))
    return {"verified": True}


# ===== Developer OTP Config Endpoints =====

@router.get("/developer/otp-config")
async def get_otp_config(user=Depends(require_role("developer"))):
    """Get OTP gateway configuration. API key is masked."""
    config = await db.otp_config.find_one({"config_id": "default"}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="OTP config not found")
    # Mask API key
    if config.get("api_key"):
        key = config["api_key"]
        config["api_key_masked"] = key[:4] + "****" + key[-4:] if len(key) > 8 else "****"
    else:
        config["api_key_masked"] = ""
    config.pop("api_key", None)
    return config


@router.put("/developer/otp-config")
async def update_otp_config(data: OTPConfigUpdate, user=Depends(require_role("developer"))):
    """Update OTP gateway configuration."""
    update_fields = {}
    for k, v in data.dict(exclude_unset=True).items():
        if v is not None:
            update_fields[k] = v
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_fields["updated_by"] = user.get("email", "developer")

    await db.otp_config.update_one(
        {"config_id": "default"},
        {"$set": update_fields},
    )

    # Audit log
    await db.audit_logs.insert_one({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "role": "developer",
        "user_id": user.get("email", ""),
        "action": "update_otp_config",
        "details": {k: v for k, v in update_fields.items() if k != "api_key"},
    })

    return {"message": "OTP configuration updated"}


@router.post("/developer/otp-test")
async def test_otp(data: OTPTestRequest, request: Request, user=Depends(require_role("developer"))):
    """Send a test OTP using current config."""
    ip = request.client.host if request.client else ""
    result = await otp_service.send_otp(data.mobile, ip_address=ip)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Test OTP failed"))
    return {"message": "Test OTP sent", "expires_in": result.get("expires_in", 300)}


@router.get("/developer/otp-usage")
async def get_otp_usage(user=Depends(require_role("developer"))):
    """OTP usage stats: today, month, total, monthly breakdown, cost estimate."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    today_count = await db.otp_logs.count_documents({"sent_at": {"$gte": today_start}})
    month_count = await db.otp_logs.count_documents({"sent_at": {"$gte": month_start}})
    total_count = await db.otp_logs.count_documents({})

    # Monthly breakdown (last 6 months)
    monthly_pipeline = [
        {"$addFields": {"month": {"$substr": ["$sent_at", 0, 7]}}},
        {"$group": {"_id": "$month", "count": {"$sum": 1}, "cost": {"$sum": "$cost_estimate"}}},
        {"$sort": {"_id": -1}},
        {"$limit": 6},
    ]
    monthly = await db.otp_logs.aggregate(monthly_pipeline).to_list(6)

    # Cost estimate (total)
    cost_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$cost_estimate"}}}]
    cost_result = await db.otp_logs.aggregate(cost_pipeline).to_list(1)
    total_cost = cost_result[0]["total"] if cost_result else 0

    # Recent logs (20 most recent)
    recent_logs = await db.otp_logs.find(
        {}, {"_id": 0, "otp_hash": 0}
    ).sort("sent_at", -1).to_list(20)

    # Mask mobile numbers
    for log in recent_logs:
        m = log.get("mobile", "")
        if len(m) >= 6:
            log["mobile"] = m[:2] + "xxx" + m[-3:]

    return {
        "today_count": today_count,
        "month_count": month_count,
        "total_count": total_count,
        "total_cost": round(total_cost, 2),
        "monthly_breakdown": [{"month": m["_id"], "count": m["count"], "cost": round(m["cost"], 2)} for m in monthly],
        "recent_logs": recent_logs,
    }
