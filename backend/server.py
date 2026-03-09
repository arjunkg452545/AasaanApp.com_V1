# MAX 100 LINES - App init, middleware, CORS, startup events, router includes only.
"""FastAPI application entry point. All route logic lives in routes/ modules."""
from dotenv import load_dotenv
from pathlib import Path
import os

# Load environment variables FIRST before any other imports
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import logging
from datetime import datetime, timezone

from auth import hash_password
from database import db, client

# Import subscription settings constant for startup seeding
from routes.subscription_settings import DEFAULT_SUBSCRIPTION_SETTINGS
from routes.messaging_config import DEFAULT_MESSAGING_CONFIG

app = FastAPI()

# ===== MOUNT ALL ROUTE MODULES =====
from routes.superadmin import router as superadmin_router
from routes.superadmin_members import router as superadmin_members_router
from routes.chapter_admin import router as chapter_admin_router
from routes.chapter_admin_enhanced import router as chapter_admin_enhanced_router
from routes.meetings import router as meetings_router
from routes.public import router as public_router
from routes.fund_kitty import router as fund_kitty_router
from routes.fund_meetingfee import router as fund_meetingfee_router
from routes.fund_misc import router as fund_misc_router
from routes.fund_events import router as fund_events_router
from routes.fund_reports import router as fund_reports_router
from routes.fund_reports_excel import router as fund_reports_excel_router
from routes.fund_reports_pdf import router as fund_reports_pdf_router
from routes.developer import router as developer_router
from routes.subscription_settings import router as subscription_settings_router
from routes.seed_data import router as seed_data_router
from routes.member_auth import router as member_auth_router
from routes.payment_config import router as payment_config_router
from routes.fee_ledger import router as fee_ledger_router
from routes.member_portal import router as member_portal_router
from routes.admin_verification import router as admin_verification_router
from routes.ed_approval import router as ed_approval_router
from routes.payment_reminders import router as payment_reminders_router
from routes.payment_gateway import router as payment_gateway_router
from routes.admin_auth import router as admin_auth_router
from routes.visitors import router as visitors_router
from routes.accountant_reports import router as accountant_reports_router
from routes.superadmin_reports import router as superadmin_reports_router
from routes.audit_log import router as audit_log_router
from routes.otp import router as otp_router
from routes.notifications import router as notifications_router
from routes.messaging_config import router as messaging_config_router
from routes.password_reset import router as password_reset_router

for r in [
    superadmin_router, superadmin_members_router,
    chapter_admin_router, chapter_admin_enhanced_router,
    meetings_router, public_router,
    fund_kitty_router, fund_meetingfee_router, fund_misc_router, fund_events_router,
    fund_reports_router, fund_reports_excel_router, fund_reports_pdf_router,
    developer_router, subscription_settings_router, seed_data_router,
    member_auth_router, payment_config_router, fee_ledger_router,
    member_portal_router, admin_verification_router, ed_approval_router,
    payment_reminders_router, payment_gateway_router, admin_auth_router,
    visitors_router, accountant_reports_router, superadmin_reports_router, audit_log_router,
    otp_router,
    notifications_router, messaging_config_router,
    password_reset_router,
]:
    app.include_router(r)

# Serve uploaded files (payment proofs, etc.)
_uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(_uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")

_allowed_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://aasaan-app-com-v1.vercel.app,https://aasaanapp.com"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _allowed_origins],
    allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    # Initialize super admin if not exists
    existing = await db.superadmins.find_one({"mobile": "919893452545"})
    if not existing:
        await db.superadmins.insert_one({
            "mobile": "919893452545",
            "password_hash": hash_password("superadmin123@"),
            "must_reset": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Super admin created")

    # Migration: fix developer record with wrong field name (developer_id → dev_id)
    import uuid
    bad_dev = await db.developers.find_one({"email": "arjun@saiinfratel.in", "dev_id": {"$exists": False}})
    if bad_dev:
        await db.developers.delete_one({"email": "arjun@saiinfratel.in"})
        logger.info("Deleted developer arjun@saiinfratel.in with wrong field names")

    # Seed developer: arjun@saiinfratel.in
    existing_dev = await db.developers.find_one({"email": "arjun@saiinfratel.in"})
    if not existing_dev:
        await db.developers.insert_one({
            "dev_id": str(uuid.uuid4()),
            "email": "arjun@saiinfratel.in",
            "name": "Arjun - SIPL",
            "mobile": "9893452545",
            "password_hash": hash_password("Arjun452545@"),
            "role": "developer",
            "company": "SIPL",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Developer arjun@saiinfratel.in seeded")

    # Seed default subscription settings
    if not await db.subscription_settings.find_one({"setting_id": "default"}):
        await db.subscription_settings.insert_one({**DEFAULT_SUBSCRIPTION_SETTINGS})
        logger.info("Default subscription settings seeded")

    # Seed default messaging config
    if not await db.messaging_config.find_one({"config_id": "default"}):
        await db.messaging_config.insert_one({**DEFAULT_MESSAGING_CONFIG, "updated_at": datetime.now(timezone.utc).isoformat()})
        logger.info("Default messaging config seeded")

    # Migration: Enhanced Member Fields
    migrated = await db.members.update_many(
        {"membership_status": {"$exists": False}},
        {"$set": {"membership_status": "active", "email": None, "business_name": None,
                  "business_category": None, "joining_date": None, "renewal_date": None,
                  "induction_fee": None, "status_history": [], "archived": False,
                  "transfer_from_chapter": None, "transfer_date": None}}
    )
    if migrated.modified_count > 0:
        logger.info(f"Migrated {migrated.modified_count} members with enhanced fields")

    # Create indexes
    await db.members.create_index([("chapter_id", 1), ("membership_status", 1)])
    await db.members.create_index([("chapter_id", 1), ("status", 1)])
    await db.members.create_index([("membership_status", 1)])
    await db.member_credentials.create_index("mobile", unique=True)
    await db.member_credentials.create_index("member_id", unique=True)
    await db.payment_config.create_index("superadmin_id", unique=True)
    await db.chapter_fee_config.create_index("chapter_id", unique=True)
    await db.fee_ledger.create_index([("chapter_id", 1), ("member_id", 1), ("status", 1)])
    await db.fee_ledger.create_index([("chapter_id", 1), ("status", 1), ("fee_type", 1)])
    await db.fee_ledger.create_index([("member_id", 1), ("status", 1)])
    await db.accountant_credentials.create_index("mobile", unique=True)
    await db.visitors.create_index([("chapter_id", 1), ("created_at", -1)])
    await db.audit_logs.create_index([("timestamp", -1)])
    await db.audit_logs.create_index([("role", 1), ("action", 1)])
    await db.notifications.create_index([("chapter_id", 1), ("created_at", -1)])
    await db.notification_reads.create_index([("member_id", 1), ("read_at", 1)])
    await db.notification_reads.create_index([("notification_id", 1)])
    logger.info("All indexes ensured")

    # Migration: Add chapter_role to members
    migrated_roles = await db.members.update_many(
        {"chapter_role": {"$exists": False}},
        {"$set": {"chapter_role": "member"}}
    )
    if migrated_roles.modified_count > 0:
        logger.info(f"Migrated {migrated_roles.modified_count} members with chapter_role field")

    # Migration: Auto-generate chapter_code for existing chapters
    from routes.superadmin import _generate_chapter_code
    chapters_without_code = await db.chapters.find(
        {"chapter_code": {"$exists": False}}, {"_id": 0, "chapter_id": 1, "name": 1}
    ).to_list(1000)
    used_codes = set()
    existing_codes = await db.chapters.find(
        {"chapter_code": {"$exists": True}}, {"_id": 0, "chapter_code": 1}
    ).to_list(1000)
    for ec in existing_codes:
        used_codes.add(ec["chapter_code"])
    for ch in chapters_without_code:
        code = _generate_chapter_code(ch["name"])
        if code in used_codes:
            for i in range(2, 100):
                candidate = f"{code[:2]}{i}"
                if candidate not in used_codes:
                    code = candidate
                    break
        used_codes.add(code)
        await db.chapters.update_one(
            {"chapter_id": ch["chapter_id"]}, {"$set": {"chapter_code": code}}
        )
    if chapters_without_code:
        logger.info(f"Migrated {len(chapters_without_code)} chapters with auto-generated chapter_code")

    # Migration: Re-generate member IDs to BNI-{CODE}-{NNN} format
    all_chapters = await db.chapters.find(
        {"chapter_code": {"$exists": True}}, {"_id": 0, "chapter_id": 1, "chapter_code": 1}
    ).to_list(1000)
    for ch in all_chapters:
        chapter_id = ch["chapter_id"]
        chapter_code = ch["chapter_code"]
        prefix = f"BNI-{chapter_code}-"
        # Find members with old-format IDs (not starting with BNI-)
        old_members = await db.members.find(
            {"chapter_id": chapter_id, "unique_member_id": {"$not": {"$regex": "^BNI-"}}},
            {"_id": 0, "member_id": 1, "unique_member_id": 1}
        ).sort("created_at", 1).to_list(5000)
        if not old_members:
            continue
        # Find current max number for this chapter
        existing_bni = await db.members.find(
            {"chapter_id": chapter_id, "unique_member_id": {"$regex": f"^{prefix}"}},
            {"_id": 0, "unique_member_id": 1}
        ).to_list(5000)
        max_num = 0
        for em in existing_bni:
            try:
                num = int(em["unique_member_id"].split("-")[-1])
                if num > max_num:
                    max_num = num
            except (ValueError, IndexError):
                pass
        for m in old_members:
            max_num += 1
            new_id = f"{prefix}{max_num:03d}"
            await db.members.update_one(
                {"member_id": m["member_id"]},
                {"$set": {"unique_member_id": new_id, "bni_member_id": new_id}}
            )
            logger.info(f"Migrated member ID: {m['unique_member_id']} -> {new_id}")

    # Index: unique chapter_code
    await db.chapters.create_index("chapter_code", unique=True, sparse=True)
    # Index: unique member ID across system
    await db.members.create_index("unique_member_id", unique=True, sparse=True)
    # Index: unique primary_mobile across system
    try:
        await db.members.create_index("primary_mobile", unique=True, sparse=True)
    except Exception as e:
        logger.warning(f"Could not create unique primary_mobile index (duplicates may exist): {e}")
    logger.info("Phase C indexes ensured")

    # Seed default OTP config
    if not await db.otp_config.find_one({"config_id": "default"}):
        await db.otp_config.insert_one({
            "config_id": "default",
            "enabled": False,
            "provider": "msg91",
            "api_key": "",
            "sender_id": "AASAAN",
            "template_id": "",
            "otp_length": 6,
            "expiry_minutes": 5,
            "daily_limit_per_number": 5,
            "template_text": "Your AasaanApp OTP is {otp}. Valid for {minutes} minutes.",
            "updated_at": "",
            "updated_by": "",
        })
        logger.info("Default OTP config seeded")

    # Seed app version config
    if not await db.app_config.find_one({"config_id": "app_version"}):
        await db.app_config.insert_one({
            "config_id": "app_version",
            "latest_version": "1.3.0",
            "min_supported_version": "1.0.0",
            "force_update": False,
            "update_message": "New features available!",
            "release_notes": "OTP-Ready Structure, Persistent Login, Auto-generated Member IDs",
        })
        logger.info("App version config seeded")

    # Migration: Add must_reset field to existing credentials
    for coll_name in ["member_credentials", "superadmins", "accountant_credentials"]:
        coll = db[coll_name]
        mr = await coll.update_many(
            {"must_reset": {"$exists": False}},
            {"$set": {"must_reset": False}}
        )
        if mr.modified_count > 0:
            logger.info(f"Migrated {mr.modified_count} docs in {coll_name} with must_reset=False")

    # Password reset OTP indexes
    await db.password_reset_otps.create_index("mobile", unique=True)
    await db.password_reset_otps.create_index("expires_at")

    # OTP indexes
    await db.otp_logs.create_index([("mobile", 1), ("sent_at", -1)])
    await db.otp_logs.create_index([("mobile", 1), ("status", 1)])
    logger.info("Phase D indexes ensured")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
