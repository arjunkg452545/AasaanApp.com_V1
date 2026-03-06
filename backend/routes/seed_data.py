# MAX 400 LINES - Test data seeding endpoint
"""Developer seed test data: creates SuperAdmin, chapter, members, payments, meetings, attendance."""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from database import db
from deps import require_role
from auth import hash_password
from qr_generator import generate_qr_token

router = APIRouter(prefix="/api", tags=["seed-data"])


async def _seed_superadmin(password_hash, now_iso, created, user):
    """Seed SuperAdmin (ED) account."""
    ed_mobile = "9999900001"
    existing_ed = await db.superadmins.find_one({"mobile": ed_mobile})
    if existing_ed:
        created["superadmin"] = "skipped"
        return existing_ed.get("superadmin_id", ed_mobile)

    superadmin_id = str(uuid4())
    await db.superadmins.insert_one({
        "superadmin_id": superadmin_id, "name": "Arjun Gupta (Test ED)",
        "email": "ed@test.com", "mobile": ed_mobile,
        "password_hash": password_hash, "region": "Chhattisgarh",
        "state": "CG", "is_active": True, "created_at": now_iso,
        "created_by": user.get("email")
    })
    created["superadmin"] = "created"
    return superadmin_id


async def _seed_subscription(superadmin_id, now, now_iso, created):
    """Seed free trial subscription."""
    existing_sub = await db.subscriptions.find_one({"superadmin_id": superadmin_id, "status": "active"})
    if existing_sub:
        created["subscription"] = "skipped"
        return

    await db.subscriptions.insert_one({
        "subscription_id": str(uuid4()), "superadmin_id": superadmin_id,
        "plan_type": "trial", "billing_cycle": "monthly", "chapters_allowed": 1,
        "start_date": now_iso, "end_date": (now + timedelta(days=30)).isoformat(),
        "amount_paid": 0, "payment_method": "manual", "payment_ref": "free_trial",
        "status": "active", "auto_renew": False, "created_at": now_iso
    })
    created["subscription"] = "created"


async def _seed_chapter(password_hash, now, now_iso, created):
    """Seed test chapter."""
    admin_mobile = "9999900002"
    existing_chapter = await db.chapters.find_one({"admin_mobile": admin_mobile})
    if existing_chapter:
        created["chapter"] = "skipped"
        return existing_chapter["chapter_id"]

    chapter_id = f"CH{now.strftime('%Y%m%d%H%M%S')}"
    await db.chapters.insert_one({
        "chapter_id": chapter_id, "name": "BNI Sunrise Test Chapter",
        "created_by": "9999900001", "admin_mobile": admin_mobile,
        "admin_password_hash": hash_password("Test@1234"),
        "region": "Raipur", "state": "CG", "city": "Raipur",
        "status": "active", "audit_logs": [], "created_at": now_iso
    })
    created["chapter"] = "created"
    return chapter_id


async def _seed_members(chapter_id, password_hash, now_iso, created):
    """Seed 5 test members and their credentials."""
    member_specs = [
        {"mobile": "9999900003", "name": "Rajesh Kumar", "biz": "Kumar Construction", "cat": "Construction", "uid": "TEST001"},
        {"mobile": "9999900004", "name": "Priya Patel", "biz": "Patel IT Solutions", "cat": "IT Services", "uid": "TEST002"},
        {"mobile": "9999900005", "name": "Suresh Agarwal", "biz": "Agarwal Finance", "cat": "Finance", "uid": "TEST003"},
        {"mobile": "9999900006", "name": "Neha Singh", "biz": "Singh Legal Associates", "cat": "Legal", "uid": "TEST004"},
        {"mobile": "9999900007", "name": "Amit Verma", "biz": "Verma Healthcare", "cat": "Healthcare", "uid": "TEST005"},
    ]

    member_records = []
    for spec in member_specs:
        existing_member = await db.members.find_one({"primary_mobile": spec["mobile"]})
        if existing_member:
            member_records.append(existing_member)
            created["members"].append({"mobile": spec["mobile"], "status": "skipped"})
        else:
            member_id = str(uuid4())
            member_data = {
                "member_id": member_id, "chapter_id": chapter_id,
                "unique_member_id": spec["uid"], "full_name": spec["name"],
                "primary_mobile": spec["mobile"], "secondary_mobile": None,
                "email": None, "business_name": spec["biz"],
                "business_category": spec["cat"], "joining_date": None,
                "renewal_date": None, "induction_fee": None,
                "membership_status": "active", "status": "Active",
                "created_at": now_iso, "bni_member_id": spec["uid"],
                "organization_id": chapter_id,
                "status_history": [{"action": "created", "from_status": None,
                    "to_status": "active", "reason": "Seeded test member",
                    "changed_by": "developer", "timestamp": now_iso}],
                "archived": False, "transfer_from_chapter": None, "transfer_date": None,
            }
            await db.members.insert_one(member_data)
            member_records.append(member_data)
            created["members"].append({"mobile": spec["mobile"], "status": "created"})

        # Member credentials
        existing_cred = await db.member_credentials.find_one({"mobile": spec["mobile"]})
        if existing_cred:
            created["member_credentials"].append({"mobile": spec["mobile"], "status": "skipped"})
        else:
            m_id = member_records[-1]["member_id"]
            await db.member_credentials.insert_one({
                "credential_id": str(uuid4()), "member_id": m_id,
                "mobile": spec["mobile"], "password_hash": password_hash,
                "is_active": True, "created_at": now_iso,
                "updated_at": now_iso, "updated_by": "system"
            })
            created["member_credentials"].append({"mobile": spec["mobile"], "status": "created"})

    return member_records, member_specs


async def _seed_accountant_and_config(superadmin_id, password_hash, now_iso, created):
    """Seed accountant credentials and payment config."""
    acct_mobile = "9999900008"
    existing_acct = await db.accountant_credentials.find_one({"mobile": acct_mobile})
    if existing_acct:
        created["accountant"] = "skipped"
    else:
        await db.accountant_credentials.insert_one({
            "accountant_id": str(uuid4()), "superadmin_id": superadmin_id,
            "name": "Vikram Accountant", "mobile": acct_mobile,
            "email": "accountant@test.com", "password_hash": password_hash,
            "is_active": True, "created_at": now_iso, "updated_at": now_iso,
        })
        created["accountant"] = "created"

    ed_mobile = "9999900001"
    existing_pc = await db.payment_config.find_one({"superadmin_id": ed_mobile})
    if existing_pc:
        created["payment_config"] = "skipped"
    else:
        await db.payment_config.insert_one({
            "superadmin_id": ed_mobile, "upi_id": "testED@upi",
            "upi_holder_name": "Test ED", "upi_qr_data": None,
            "bank_enabled": True, "bank_account_name": "Test ED",
            "bank_account_number": "1234567890", "bank_ifsc": "TEST0001234",
            "bank_name": "Test Bank", "bank_branch": None,
            "manual_payment_enabled": True, "require_screenshot": True,
            "require_utr": True, "two_level_verification": True,
            "default_fees": {"kitty_amount": 2000, "meeting_fee": 500, "induction_fee": 0, "renewal_fee": 0},
            "gateway_enabled": False, "gateway_provider": None,
            "created_at": now_iso, "updated_at": now_iso,
        })
        created["payment_config"] = "created"


async def _seed_fees(chapter_id, member_records, now, now_iso, created):
    """Seed fee ledger and legacy bridge entries."""
    current_month = now.month
    current_year = now.year
    month_names = ["January", "February", "March", "April", "May", "June",
                   "July", "August", "September", "October", "November", "December"]
    month_name = month_names[current_month - 1]
    admin_mobile = "9999900002"
    ed_mobile = "9999900001"

    kitty_statuses = {0: "verified", 1: "verified", 2: "submitted", 3: "pending", 4: "pending"}

    for idx, member in enumerate(member_records):
        m_id = member["member_id"]
        m_name = member.get("full_name", "")
        for fee_type, amount in [("kitty", 2000.0), ("meeting_fee", 500.0)]:
            existing_fee = await db.fee_ledger.find_one({
                "chapter_id": chapter_id, "member_id": m_id,
                "month": current_month, "year": current_year, "fee_type": fee_type,
            })
            if existing_fee:
                continue
            status = kitty_statuses[idx] if fee_type == "kitty" else "pending"
            timeline = [{"action": "created", "by": "developer", "role": "system", "at": now_iso, "note": "Seeded test fee"}]
            payment_method = utr_number = payment_date = None
            if status in ("submitted", "admin_confirmed", "verified"):
                timeline.append({"action": "submitted", "by": member.get("primary_mobile", ""), "role": "member", "at": now_iso, "note": "Test payment proof"})
                payment_method, utr_number, payment_date = "upi", f"UTR{m_id[:8].upper()}", now_iso
            if status in ("admin_confirmed", "verified"):
                timeline.append({"action": "admin_confirmed", "by": admin_mobile, "role": "admin", "at": now_iso, "note": "Admin confirmed"})
            if status == "verified":
                timeline.append({"action": "verified", "by": ed_mobile, "role": "superadmin", "at": now_iso, "note": "ED verified"})
            fee_type_label = "Kitty" if fee_type == "kitty" else "Meeting Fee"
            await db.fee_ledger.insert_one({
                "ledger_id": str(uuid4()), "chapter_id": chapter_id, "member_id": m_id,
                "member_name": m_name, "fee_type": fee_type, "amount": amount,
                "month": current_month, "year": current_year, "due_date": None,
                "description": f"{fee_type_label} - {month_name} {current_year}",
                "status": status, "payment_method": payment_method,
                "utr_number": utr_number, "payment_date": payment_date,
                "proof_file": None, "timeline": timeline, "created_at": now_iso, "updated_at": now_iso,
            })
            created["fee_ledger"][fee_type] += 1

    # Legacy bridge for verified members
    for idx in [0, 1]:
        if idx >= len(member_records):
            break
        member = member_records[idx]
        m_id = member["member_id"]
        existing_legacy = await db.kitty_payments.find_one({
            "chapter_id": chapter_id, "member_id": m_id, "month": current_month, "year": current_year,
        })
        if not existing_legacy:
            await db.kitty_payments.insert_one({
                "payment_id": f"KP{now.strftime('%Y%m%d%H%M%S')}{idx}", "chapter_id": chapter_id,
                "member_id": m_id, "member_name": member.get("full_name", ""),
                "month": current_month, "year": current_year, "amount": 2000.0,
                "status": "paid", "paid_date": now.strftime("%Y-%m-%d"),
                "received_by": None, "fee_ledger_id": None, "updated_at": now_iso,
            })
            created["legacy_bridge"] += 1


async def _seed_meetings_and_attendance(chapter_id, member_records, now, now_iso, created):
    """Seed meetings and attendance records."""
    wednesdays = []
    meeting_ids = []
    d = now.date()
    days_since_wed = (d.weekday() - 2) % 7
    if days_since_wed == 0:
        days_since_wed = 7
    last_wed = d - timedelta(days=days_since_wed)
    for i in range(4):
        wednesdays.append(last_wed - timedelta(weeks=i))
    wednesdays.reverse()

    for wed_date in wednesdays:
        mt_id = f"MT{wed_date.strftime('%Y%m%d')}090000"
        existing_meeting = await db.meetings.find_one({"meeting_id": mt_id})
        if existing_meeting:
            meeting_ids.append(mt_id)
            continue

        start_utc = datetime(wed_date.year, wed_date.month, wed_date.day, 3, 30, 0, tzinfo=timezone.utc)
        qr_token = generate_qr_token(mt_id, chapter_id, "all")

        await db.meetings.insert_one({
            "meeting_id": mt_id, "chapter_id": chapter_id, "date": wed_date.isoformat(),
            "start_time": start_utc.isoformat(),
            "late_cutoff_time": (start_utc + timedelta(minutes=30)).isoformat(),
            "end_time": (start_utc + timedelta(hours=2)).isoformat(),
            "qr_token": qr_token,
            "qr_expires_at": (now + timedelta(seconds=10)).isoformat(),
            "created_at": now_iso,
        })
        meeting_ids.append(mt_id)
        created["meetings"] += 1

    attendance_matrix = [
        [True, True, True, True], [False, True, True, True],
        [False, False, True, True], [False, False, False, True],
        [True, True, True, True],
    ]

    for m_idx, member in enumerate(member_records):
        for w_idx, mt_id in enumerate(meeting_ids):
            if not attendance_matrix[m_idx][w_idx]:
                continue
            existing_att = await db.attendance.find_one({
                "meeting_id": mt_id, "unique_member_id": member.get("unique_member_id"),
            })
            if existing_att:
                continue
            wed_date = wednesdays[w_idx]
            att_time = datetime(wed_date.year, wed_date.month, wed_date.day, 3, 35, 0, tzinfo=timezone.utc)
            await db.attendance.insert_one({
                "attendance_id": f"A{wed_date.strftime('%Y%m%d')}0935{m_idx:02d}000000",
                "meeting_id": mt_id, "unique_member_id": member.get("unique_member_id"),
                "type": "member", "status": "Present", "timestamp": att_time.isoformat(),
                "late_type": "On time", "member_name": member.get("full_name"),
                "primary_mobile": member.get("primary_mobile"),
                "substitute_name": None, "substitute_mobile": None,
                "visitor_name": None, "visitor_mobile": None, "visitor_company": None,
                "invited_by_member_id": None, "invited_by_member_name": None,
                "device_fingerprint": None, "ip_address": None, "approval_status": "approved",
            })
            created["attendance"] += 1


@router.post("/developer/seed-test-data")
async def seed_test_data(user=Depends(require_role("developer"))):
    """Seed complete test data for all roles. Idempotent."""
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    password_hash = hash_password("Test@1234")
    created = {
        "superadmin": None, "subscription": None, "chapter": None,
        "members": [], "member_credentials": [], "accountant": None,
        "payment_config": None, "fee_ledger": {"kitty": 0, "meeting_fee": 0},
        "meetings": 0, "attendance": 0, "legacy_bridge": 0,
    }

    superadmin_id = await _seed_superadmin(password_hash, now_iso, created, user)
    await _seed_subscription(superadmin_id, now, now_iso, created)
    chapter_id = await _seed_chapter(password_hash, now, now_iso, created)
    member_records, member_specs = await _seed_members(chapter_id, password_hash, now_iso, created)
    await _seed_accountant_and_config(superadmin_id, password_hash, now_iso, created)
    await _seed_fees(chapter_id, member_records, now, now_iso, created)
    await _seed_meetings_and_attendance(chapter_id, member_records, now, now_iso, created)

    return {
        "message": "Test data seeding complete",
        "created_summary": created,
        "login_credentials": {
            "developer": {"note": "Use your existing developer account", "endpoint": "/api/developer/login", "email": "admin@aasaanapp.com", "password": "AasaanAdmin2026!"},
            "superadmin_ed": {"endpoint": "/api/superadmin/login", "mobile": "9999900001", "password": "Test@1234", "role": "superadmin", "name": "Arjun Gupta (Test ED)"},
            "chapter_admin": {"endpoint": "/api/admin/login", "mobile": "9999900002", "password": "Test@1234", "role": "admin", "chapter": "BNI Sunrise Test Chapter"},
            "members": [{"endpoint": "/api/member/login", "mobile": spec["mobile"], "password": "Test@1234", "role": "member", "name": spec["name"]} for spec in member_specs],
            "accountant": {"endpoint": "/api/accountant/login", "mobile": "9999900008", "password": "Test@1234", "role": "accountant", "name": "Vikram Accountant"}
        },
        "chapter_id": chapter_id,
        "test_data_summary": {
            "ed": "9999900001 / Test@1234", "admin": "9999900002 / Test@1234",
            "members": "9999900003-07 / Test@1234", "accountant": "9999900008 / Test@1234",
            "chapter": "BNI Sunrise Test Chapter",
        }
    }
