"""
Payment Configuration Routes
- ED (SuperAdmin) sets UPI, bank, fee defaults, verification settings
- Per-chapter fee overrides
- Admin reads chapter fee config (read-only)
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone

from database import db
from deps import get_current_user, require_role
from models_payment import PaymentConfigUpdate, ChapterFeeConfigUpdate

router = APIRouter(prefix="/api")


# ===== ED PAYMENT CONFIG =====

@router.get("/superadmin/payment-config")
async def get_payment_config(user=Depends(require_role("superadmin"))):
    """Get ED's payment configuration. Auto-creates default if missing."""
    sa_id = user.get("mobile", "")
    config = await db.payment_config.find_one({"superadmin_id": sa_id}, {"_id": 0})

    if not config:
        config = {
            "superadmin_id": sa_id,
            "upi_id": None,
            "upi_holder_name": None,
            "upi_qr_data": None,
            "bank_enabled": False,
            "bank_account_name": None,
            "bank_account_number": None,
            "bank_ifsc": None,
            "bank_name": None,
            "bank_branch": None,
            "manual_payment_enabled": True,
            "require_screenshot": True,
            "require_utr": True,
            "two_level_verification": True,
            "default_fees": {
                "kitty_amount": 0,
                "meeting_fee": 0,
                "induction_fee": 0,
                "renewal_fee": 0,
            },
            "gateway_enabled": False,
            "gateway_provider": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.payment_config.insert_one({**config, "_id": None})
        # Remove MongoDB _id
        config.pop("_id", None)

    return config


@router.put("/superadmin/payment-config")
async def update_payment_config(data: PaymentConfigUpdate, user=Depends(require_role("superadmin"))):
    """Update ED's payment configuration."""
    sa_id = user.get("mobile", "")

    update_data = data.dict(exclude_unset=True)
    if "default_fees" in update_data and update_data["default_fees"]:
        update_data["default_fees"] = update_data["default_fees"].dict() if hasattr(update_data["default_fees"], 'dict') else update_data["default_fees"]
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.payment_config.update_one(
        {"superadmin_id": sa_id},
        {"$set": update_data,
         "$setOnInsert": {
             "superadmin_id": sa_id,
             "created_at": datetime.now(timezone.utc).isoformat(),
         }},
        upsert=True,
    )

    return {"message": "Payment config updated"}


# ===== CHAPTER FEE CONFIG =====

@router.get("/superadmin/chapter/{chapter_id}/fee-config")
async def get_chapter_fee_config(chapter_id: str, user=Depends(require_role("superadmin"))):
    """Get per-chapter fee config. Falls back to ED defaults if not set."""
    # Verify chapter belongs to this ED
    mobile = user.get("mobile", "")
    chapter = await db.chapters.find_one({"chapter_id": chapter_id, "created_by": mobile}, {"_id": 0})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found or not owned by you")

    config = await db.chapter_fee_config.find_one({"chapter_id": chapter_id}, {"_id": 0})

    if not config:
        # Fall back to ED's default fees
        sa_id = user.get("mobile", "")
        payment_config = await db.payment_config.find_one({"superadmin_id": sa_id}, {"_id": 0})
        defaults = payment_config.get("default_fees", {}) if payment_config else {}

        config = {
            "chapter_id": chapter_id,
            "chapter_name": chapter.get("name", ""),
            "kitty_amount": defaults.get("kitty_amount", 0),
            "meeting_fee": defaults.get("meeting_fee", 0),
            "induction_fee": defaults.get("induction_fee", 0),
            "renewal_fee": defaults.get("renewal_fee", 0),
            "custom_fees": [],
            "is_override": False,
        }
    else:
        config["chapter_name"] = chapter.get("name", "")
        config["is_override"] = True

    return config


@router.put("/superadmin/chapter/{chapter_id}/fee-config")
async def set_chapter_fee_config(
    chapter_id: str,
    data: ChapterFeeConfigUpdate,
    user=Depends(require_role("superadmin")),
):
    """Set per-chapter fee overrides."""
    mobile = user.get("mobile", "")
    chapter = await db.chapters.find_one({"chapter_id": chapter_id, "created_by": mobile}, {"_id": 0})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found or not owned by you")

    update_data = data.dict(exclude_unset=True)
    if "custom_fees" in update_data:
        update_data["custom_fees"] = [cf.dict() if hasattr(cf, 'dict') else cf for cf in update_data["custom_fees"]]
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.chapter_fee_config.update_one(
        {"chapter_id": chapter_id},
        {"$set": update_data,
         "$setOnInsert": {
             "chapter_id": chapter_id,
             "created_at": datetime.now(timezone.utc).isoformat(),
         }},
        upsert=True,
    )

    return {"message": "Chapter fee config updated"}


@router.get("/admin/chapter/fee-config")
async def admin_get_chapter_fee_config(user=Depends(require_role("admin"))):
    """Admin reads their chapter's fee config (read-only)."""
    chapter_id = user.get("chapter_id")
    if not chapter_id:
        raise HTTPException(status_code=400, detail="No chapter assigned")

    config = await db.chapter_fee_config.find_one({"chapter_id": chapter_id}, {"_id": 0})

    if not config:
        # Fall back: find ED who owns this chapter and use their defaults
        chapter = await db.chapters.find_one({"chapter_id": chapter_id}, {"_id": 0})
        if not chapter:
            raise HTTPException(status_code=404, detail="Chapter not found")

        created_by = chapter.get("created_by", "")
        payment_config = await db.payment_config.find_one({"superadmin_id": created_by}, {"_id": 0})
        defaults = payment_config.get("default_fees", {}) if payment_config else {}

        config = {
            "chapter_id": chapter_id,
            "kitty_amount": defaults.get("kitty_amount", 0),
            "meeting_fee": defaults.get("meeting_fee", 0),
            "induction_fee": defaults.get("induction_fee", 0),
            "renewal_fee": defaults.get("renewal_fee", 0),
            "custom_fees": [],
        }

    return config
