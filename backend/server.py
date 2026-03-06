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
]:
    app.include_router(r)

# Serve uploaded files (payment proofs, etc.)
_uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(_uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
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
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Super admin created")

    # Seed default subscription settings
    if not await db.subscription_settings.find_one({"setting_id": "default"}):
        await db.subscription_settings.insert_one({**DEFAULT_SUBSCRIPTION_SETTINGS})
        logger.info("Default subscription settings seeded")

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
    logger.info("All indexes ensured")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
