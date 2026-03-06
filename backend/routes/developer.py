# MAX 400 LINES - Split into separate route files if exceeding
"""Developer endpoints: seed, login, superadmin CRUD, dashboard stats."""
from fastapi import APIRouter, HTTPException, Depends, Response
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from database import db
from deps import get_current_user, require_role
from auth import create_access_token, verify_password, hash_password, ACCESS_TOKEN_EXPIRE_DAYS
from models import (
    DeveloperSeedRequest, DeveloperLoginRequest, DeveloperLoginResponse,
    SuperAdminCreate, SuperAdminUpdate, SuperAdminResponse,
)

router = APIRouter(prefix="/api", tags=["developer"])

# ===== DEVELOPER ENDPOINTS =====
@router.post("/developer/seed")
async def seed_developer():
    """One-time seed developer account"""
    data = DeveloperSeedRequest()

    existing = await db.developers.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Developer account already exists")

    dev_data = {
        "dev_id": str(uuid4()),
        "email": data.email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "company": "AasaanApp",
        "role": "developer",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.developers.insert_one(dev_data)
    return {"message": "Developer account seeded successfully", "email": data.email}

@router.post("/developer/login", response_model=DeveloperLoginResponse)
async def developer_login(data: DeveloperLoginRequest, response: Response):
    developer = await db.developers.find_one({"email": data.email}, {"_id": 0})
    if not developer or not verify_password(data.password, developer["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"email": data.email, "role": "developer", "dev_id": developer["dev_id"]})
    response.set_cookie(
        key="access_token", value=token, httponly=True, samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 86400, secure=False, path="/",
    )
    return DeveloperLoginResponse(token=token, role="developer", email=data.email, name=developer["name"])

@router.post("/developer/superadmins", response_model=SuperAdminResponse)
async def create_superadmin(data: SuperAdminCreate, user=Depends(require_role("developer"))):
    """Developer creates a new Super Admin / ED"""
    # Check if mobile already exists
    existing = await db.superadmins.find_one({"mobile": data.mobile})
    if existing:
        raise HTTPException(status_code=400, detail="Super Admin with this mobile already exists")

    superadmin_id = str(uuid4())
    superadmin_data = {
        "superadmin_id": superadmin_id,
        "name": data.name,
        "email": data.email,
        "mobile": data.mobile,
        "password_hash": hash_password(data.password),
        "region": data.region,
        "state": data.state,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("email")
    }
    await db.superadmins.insert_one(superadmin_data)

    # Auto-assign FREE TRIAL subscription
    settings = await db.subscription_settings.find_one({"setting_id": "default"}, {"_id": 0})
    if settings and settings.get("free_trial", {}).get("enabled", True):
        trial_days = settings.get("free_trial", {}).get("duration_days", 30)
        trial_chapters = settings.get("free_trial", {}).get("max_chapters", 1)
    else:
        trial_days = 30
        trial_chapters = 1

    trial_sub = {
        "subscription_id": str(uuid4()),
        "superadmin_id": superadmin_id,
        "plan_type": "trial",
        "billing_cycle": "monthly",
        "chapters_allowed": trial_chapters,
        "start_date": datetime.now(timezone.utc).isoformat(),
        "end_date": (datetime.now(timezone.utc) + timedelta(days=trial_days)).isoformat(),
        "amount_paid": 0,
        "payment_method": "manual",
        "payment_ref": "free_trial",
        "status": "active",
        "auto_renew": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.subscriptions.insert_one(trial_sub)

    # Count chapters for this superadmin
    chapter_count = await db.chapters.count_documents({"created_by": data.mobile})

    return SuperAdminResponse(
        superadmin_id=superadmin_id,
        name=data.name,
        email=data.email,
        mobile=data.mobile,
        region=data.region,
        state=data.state,
        is_active=True,
        created_at=superadmin_data["created_at"],
        chapter_count=chapter_count
    )

@router.get("/developer/superadmins")
async def list_superadmins(user=Depends(require_role("developer"))):
    """List all Super Admins with their chapter counts"""
    superadmins = await db.superadmins.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)

    result = []
    for sa in superadmins:
        chapter_count = await db.chapters.count_documents({"created_by": sa.get("mobile", "")})
        result.append({
            "superadmin_id": sa.get("superadmin_id", sa.get("mobile", "")),
            "name": sa.get("name", ""),
            "email": sa.get("email", ""),
            "mobile": sa.get("mobile", ""),
            "region": sa.get("region", ""),
            "state": sa.get("state", ""),
            "is_active": sa.get("is_active", True),
            "created_at": sa.get("created_at", ""),
            "chapter_count": chapter_count
        })

    return result

@router.put("/developer/superadmins/{superadmin_id}")
async def update_superadmin(superadmin_id: str, data: SuperAdminUpdate, user=Depends(require_role("developer"))):
    """Update ED details, activate/deactivate"""
    update_data = {}
    for k, v in data.dict(exclude_unset=True).items():
        if isinstance(v, bool) or v is not None:
            update_data[k] = v

    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    # Try finding by superadmin_id first, then by mobile (backward compat)
    result = await db.superadmins.update_one(
        {"$or": [{"superadmin_id": superadmin_id}, {"mobile": superadmin_id}]},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Super Admin not found")

    return {"message": "Super Admin updated successfully"}

@router.put("/developer/superadmins/{superadmin_id}/deactivate")
async def deactivate_superadmin(superadmin_id: str, user=Depends(require_role("developer"))):
    """Toggle active/inactive for a Super Admin."""
    sa = await db.superadmins.find_one(
        {"$or": [{"superadmin_id": superadmin_id}, {"mobile": superadmin_id}]},
        {"_id": 0}
    )
    if not sa:
        raise HTTPException(status_code=404, detail="Super Admin not found")

    new_active = not sa.get("is_active", True)
    update_data = {"is_active": new_active}
    if not new_active:
        update_data["deleted_at"] = datetime.now(timezone.utc).isoformat()

    await db.superadmins.update_one(
        {"$or": [{"superadmin_id": superadmin_id}, {"mobile": superadmin_id}]},
        {"$set": update_data}
    )

    action = "reactivated" if new_active else "deactivated"
    return {"message": f"Super Admin {action} successfully", "is_active": new_active}

@router.get("/developer/dashboard/stats")
async def developer_dashboard_stats(user=Depends(require_role("developer"))):
    """Dashboard stats: total EDs, chapters, members, revenue"""
    total_eds = await db.superadmins.count_documents({"is_active": {"$ne": False}})
    total_chapters = await db.chapters.count_documents({})
    total_members = await db.members.count_documents({"status": "Active"})

    # Calculate total revenue from all payment collections
    kitty_pipeline = [{"$match": {"status": "paid"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    meeting_fee_pipeline = [{"$match": {"status": "paid"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    misc_pipeline = [{"$match": {"status": "paid"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    event_pipeline = [{"$match": {"status": "paid"}}, {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]

    kitty_rev = await db.kitty_payments.aggregate(kitty_pipeline).to_list(1)
    meeting_fee_rev = await db.meeting_fee_payments.aggregate(meeting_fee_pipeline).to_list(1)
    misc_rev = await db.misc_payment_records.aggregate(misc_pipeline).to_list(1)
    event_rev = await db.event_payments.aggregate(event_pipeline).to_list(1)

    total_revenue = (
        (kitty_rev[0]["total"] if kitty_rev else 0) +
        (meeting_fee_rev[0]["total"] if meeting_fee_rev else 0) +
        (misc_rev[0]["total"] if misc_rev else 0) +
        (event_rev[0]["total"] if event_rev else 0)
    )

    return {
        "total_eds": total_eds,
        "total_chapters": total_chapters,
        "total_members": total_members,
        "total_revenue": total_revenue
    }

