# MAX 400 LINES - Subscription settings and operations
"""Subscription settings CRUD and operations: activate, extend, cancel."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from database import db
from deps import require_role
from models import SubscriptionSettingsUpdate, SubscriptionActivate, SubscriptionExtend, SubscriptionCancel

router = APIRouter(prefix="/api", tags=["subscription-settings"])

DEFAULT_SUBSCRIPTION_SETTINGS = {
    "setting_id": "default",
    "pricing_model": "per_chapter",
    "billing_cycles": [
        {"cycle": "monthly", "months": 1, "discount_percent": 0, "enabled": True},
        {"cycle": "quarterly", "months": 3, "discount_percent": 0, "enabled": True},
        {"cycle": "half_yearly", "months": 6, "discount_percent": 0, "enabled": True},
        {"cycle": "yearly", "months": 12, "discount_percent": 0, "enabled": True}
    ],
    "per_chapter_rate": 0,
    "slab_rates": [
        {"min_chapters": 1, "max_chapters": 3, "rate": 0},
        {"min_chapters": 4, "max_chapters": 10, "rate": 0},
        {"min_chapters": 11, "max_chapters": 25, "rate": 0},
        {"min_chapters": 26, "max_chapters": 9999, "rate": 0}
    ],
    "per_member_rate": 0,
    "free_trial": {"enabled": True, "duration_days": 30, "max_chapters": 1},
    "gst_percent": 18,
    "updated_at": datetime.now(timezone.utc).isoformat()
}

BILLING_CYCLE_MONTHS = {
    "monthly": 1, "quarterly": 3, "half_yearly": 6, "yearly": 12
}


@router.get("/developer/subscription-settings")
async def get_subscription_settings(user=Depends(require_role("developer"))):
    """Get current subscription settings, create defaults if not exist"""
    settings = await db.subscription_settings.find_one({"setting_id": "default"}, {"_id": 0})
    if not settings:
        await db.subscription_settings.insert_one({**DEFAULT_SUBSCRIPTION_SETTINGS})
        settings = {k: v for k, v in DEFAULT_SUBSCRIPTION_SETTINGS.items()}
    return settings


@router.put("/developer/subscription-settings")
async def update_subscription_settings(data: SubscriptionSettingsUpdate, user=Depends(require_role("developer"))):
    """Update pricing, billing cycles, discounts, free trial config"""
    update_data = {}
    for k, v in data.dict(exclude_unset=True).items():
        if v is not None:
            update_data[k] = v if not isinstance(v, list) else [item.dict() if hasattr(item, 'dict') else item for item in v]

    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.subscription_settings.update_one(
        {"setting_id": "default"}, {"$set": update_data}, upsert=True
    )
    settings = await db.subscription_settings.find_one({"setting_id": "default"}, {"_id": 0})
    return settings


@router.get("/developer/subscriptions")
async def list_subscriptions(user=Depends(require_role("developer"))):
    """List all ED subscriptions with ED details"""
    subs = await db.subscriptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)

    result = []
    for sub in subs:
        sa = await db.superadmins.find_one(
            {"$or": [{"superadmin_id": sub["superadmin_id"]}, {"mobile": sub["superadmin_id"]}]},
            {"_id": 0, "password_hash": 0}
        )
        sa_name = sa.get("name", "Unknown") if sa else "Unknown"
        sa_mobile = sa.get("mobile", "") if sa else ""
        chapters_used = await db.chapters.count_documents({"created_by": sa_mobile}) if sa_mobile else 0

        result.append({
            **sub, "ed_name": sa_name, "ed_mobile": sa_mobile, "chapters_used": chapters_used
        })

    return result


@router.post("/developer/subscriptions/activate")
async def activate_subscription(data: SubscriptionActivate, user=Depends(require_role("developer"))):
    """Manually activate a subscription for an ED"""
    sa = await db.superadmins.find_one(
        {"$or": [{"superadmin_id": data.superadmin_id}, {"mobile": data.superadmin_id}]},
        {"_id": 0}
    )
    if not sa:
        raise HTTPException(status_code=404, detail="Super Admin not found")

    await db.subscriptions.update_many(
        {"superadmin_id": data.superadmin_id, "status": "active"},
        {"$set": {"status": "expired"}}
    )

    months = BILLING_CYCLE_MONTHS.get(data.billing_cycle, 1)
    start = datetime.now(timezone.utc)
    end = start + timedelta(days=months * 30)

    sub_id = str(uuid4())
    sub_data = {
        "subscription_id": sub_id,
        "superadmin_id": data.superadmin_id,
        "plan_type": "paid",
        "billing_cycle": data.billing_cycle,
        "chapters_allowed": data.chapters_allowed,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "amount_paid": data.amount_paid,
        "payment_method": data.payment_method,
        "payment_ref": data.payment_ref,
        "status": "active",
        "auto_renew": False,
        "created_at": start.isoformat()
    }
    await db.subscriptions.insert_one(sub_data)

    settings = await db.subscription_settings.find_one({"setting_id": "default"}, {"_id": 0})
    gst_pct = settings.get("gst_percent", 18) if settings else 18
    gst_amount = round(data.amount_paid * gst_pct / (100 + gst_pct), 2)

    recharge = {
        "recharge_id": str(uuid4()),
        "superadmin_id": data.superadmin_id,
        "subscription_id": sub_id,
        "amount": round(data.amount_paid - gst_amount, 2),
        "gst_amount": gst_amount,
        "total_amount": data.amount_paid,
        "chapters_count": data.chapters_allowed,
        "billing_cycle": data.billing_cycle,
        "payment_method": data.payment_method,
        "payment_ref": data.payment_ref,
        "status": "success",
        "created_at": start.isoformat()
    }
    await db.recharge_history.insert_one(recharge)

    return {"message": "Subscription activated", "subscription_id": sub_id}


@router.post("/developer/subscriptions/extend")
async def extend_subscription(data: SubscriptionExtend, user=Depends(require_role("developer"))):
    """Extend an existing subscription"""
    sub = await db.subscriptions.find_one({"subscription_id": data.subscription_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    current_end = datetime.fromisoformat(sub["end_date"]) if isinstance(sub["end_date"], str) else sub["end_date"]
    if current_end < datetime.now(timezone.utc):
        current_end = datetime.now(timezone.utc)

    new_end = current_end + timedelta(days=data.additional_months * 30)

    await db.subscriptions.update_one(
        {"subscription_id": data.subscription_id},
        {"$set": {"end_date": new_end.isoformat(), "status": "active"}}
    )

    recharge = {
        "recharge_id": str(uuid4()),
        "superadmin_id": sub["superadmin_id"],
        "subscription_id": data.subscription_id,
        "amount": data.amount_paid,
        "gst_amount": 0,
        "total_amount": data.amount_paid,
        "chapters_count": sub.get("chapters_allowed", 0),
        "billing_cycle": sub.get("billing_cycle", ""),
        "payment_method": "manual",
        "payment_ref": data.payment_ref,
        "status": "success",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.recharge_history.insert_one(recharge)

    return {"message": "Subscription extended", "new_end_date": new_end.isoformat()}


@router.post("/developer/subscriptions/cancel")
async def cancel_subscription(data: SubscriptionCancel, user=Depends(require_role("developer"))):
    """Cancel/deactivate a subscription"""
    result = await db.subscriptions.update_one(
        {"subscription_id": data.subscription_id},
        {"$set": {"status": "cancelled"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")

    return {"message": "Subscription cancelled"}
