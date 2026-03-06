# MAX 400 LINES - Chapter Admin core endpoints
"""Chapter Admin endpoints: login, profile, member CRUD, bulk upload, template, excel upload."""
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from database import db
from deps import get_current_user
from auth import verify_password, create_access_token, hash_password
from models import LoginRequest, LoginResponse, MemberCreate, MemberResponse, MemberUpdate, List
import io

router = APIRouter(prefix="/api", tags=["chapter-admin"])


@router.post("/admin/login", response_model=LoginResponse)
async def admin_login(data: LoginRequest):
    chapter = await db.chapters.find_one({"admin_mobile": data.mobile}, {"_id": 0})
    if not chapter or not verify_password(data.password, chapter["admin_password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"mobile": data.mobile, "role": "admin", "chapter_id": chapter["chapter_id"], "chapter_name": chapter.get("name", "")})
    return LoginResponse(token=token, role="admin", mobile=data.mobile, chapter_id=chapter["chapter_id"], chapter_name=chapter.get("name", ""))


@router.get("/admin/profile")
async def get_admin_profile(user=Depends(get_current_user)):
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")
    chapter = await db.chapters.find_one({"chapter_id": user.get("chapter_id")}, {"_id": 0, "admin_password_hash": 0})
    return {
        "mobile": user.get("mobile"), "chapter_id": user.get("chapter_id"),
        "chapter_name": chapter.get("name", "") if chapter else user.get("chapter_name", ""),
        "role": user.get("role")
    }


@router.get("/admin/members")
async def get_members(search: str = "", status_filter: str = "", category: str = "", sort_by: str = "unique_member_id", user=Depends(get_current_user)):
    if user["role"] not in ("admin", "superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    chapter_id = user.get("chapter_id")
    if not chapter_id:
        raise HTTPException(status_code=400, detail="Chapter ID required")

    query = {"chapter_id": chapter_id, "archived": {"$ne": True}}
    if status_filter:
        query["membership_status"] = status_filter
    if category:
        query["business_category"] = {"$regex": category, "$options": "i"}
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"primary_mobile": {"$regex": search, "$options": "i"}},
            {"business_name": {"$regex": search, "$options": "i"}},
            {"unique_member_id": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    sort_field = sort_by if sort_by in ("full_name", "unique_member_id", "created_at", "renewal_date") else "unique_member_id"
    members = await db.members.find(query, {"_id": 0}).sort(sort_field, 1).to_list(2000)
    return members


@router.post("/admin/members", response_model=MemberResponse)
async def add_member(member: MemberCreate, user=Depends(get_current_user)):
    if user["role"] not in ("admin", "superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    chapter_id = user.get("chapter_id")
    if user["role"] == "superadmin" and not chapter_id:
        sa = await db.superadmins.find_one({"mobile": user.get("mobile")}, {"_id": 0})
        sa_id = sa.get("superadmin_id", user.get("mobile")) if sa else user.get("mobile")
        first_ch = await db.chapters.find_one({"created_by": sa_id}, {"_id": 0, "chapter_id": 1})
        if first_ch:
            chapter_id = first_ch["chapter_id"]
        else:
            raise HTTPException(status_code=400, detail="No chapter found for this SuperAdmin")

    if not chapter_id:
        raise HTTPException(status_code=400, detail="Chapter ID required")

    existing_member = await db.members.find_one({"chapter_id": chapter_id, "unique_member_id": member.unique_member_id})
    if existing_member:
        raise HTTPException(status_code=400, detail=f"Member with ID {member.unique_member_id} already exists in this chapter")

    existing_mobile = await db.members.find_one({"chapter_id": chapter_id, "primary_mobile": member.primary_mobile})
    if existing_mobile:
        raise HTTPException(status_code=400, detail="Member with this mobile number already exists")

    from uuid import uuid4

    if user["role"] == "admin":
        membership_status = "pending"
        sync_status = "Inactive"
    else:
        membership_status = "active"
        sync_status = "Active"

    member_data = {
        "member_id": str(uuid4()), "chapter_id": chapter_id,
        "unique_member_id": member.unique_member_id, "full_name": member.full_name,
        "primary_mobile": member.primary_mobile, "secondary_mobile": member.secondary_mobile,
        "email": member.email, "business_name": member.business_name,
        "business_category": member.business_category, "joining_date": member.joining_date,
        "renewal_date": member.renewal_date, "induction_fee": member.induction_fee,
        "membership_status": membership_status, "status": sync_status,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "bni_member_id": member.unique_member_id, "organization_id": chapter_id,
        "status_history": [{"action": "created", "from_status": None, "to_status": membership_status,
            "reason": "Member created", "changed_by": user.get("mobile", user.get("email", "system")),
            "timestamp": datetime.now(timezone.utc).isoformat()}],
        "archived": False, "transfer_from_chapter": None, "transfer_date": None,
    }

    try:
        await db.members.insert_one(member_data)
        return MemberResponse(**member_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add member: {str(e)}")


@router.post("/admin/members/bulk")
async def bulk_add_members(members: List[MemberCreate], user=Depends(get_current_user)):
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    from uuid import uuid4
    existing_members = await db.members.find({"chapter_id": user["chapter_id"]}, {"unique_member_id": 1, "primary_mobile": 1}).to_list(1000)
    existing_ids = {m.get("unique_member_id") for m in existing_members}
    existing_mobiles = {m.get("primary_mobile") for m in existing_members}
    inserted = 0
    skipped = []
    errors = []
    duplicate_mobiles = []

    for idx, member in enumerate(members):
        if member.unique_member_id in existing_ids:
            skipped.append(f"Row {idx+1}: Member ID {member.unique_member_id} already exists")
            continue
        if member.primary_mobile in existing_mobiles:
            skipped.append(f"Row {idx+1}: Mobile {member.primary_mobile} already exists")
            duplicate_mobiles.append(member.primary_mobile)
            continue
        member_data = {
            "member_id": str(uuid4()), "chapter_id": user["chapter_id"],
            "unique_member_id": member.unique_member_id, "full_name": member.full_name,
            "primary_mobile": member.primary_mobile, "secondary_mobile": member.secondary_mobile,
            "status": member.status, "created_at": datetime.now(timezone.utc).isoformat(),
            "bni_member_id": member.unique_member_id, "organization_id": user["chapter_id"],
        }
        try:
            await db.members.insert_one(member_data)
            inserted += 1
            existing_ids.add(member.unique_member_id)
            existing_mobiles.add(member.primary_mobile)
        except Exception as e:
            errors.append(f"Row {idx+1}: Database error: {str(e)}")

    return {
        "message": "Bulk upload completed", "total_processed": len(members),
        "successfully_added": inserted, "duplicate_mobiles": duplicate_mobiles,
        "skipped": len(skipped), "errors": len(errors),
        "skipped_details": skipped if skipped else None, "error_details": errors if errors else None
    }


@router.get("/admin/members/template")
async def download_member_template(user=Depends(get_current_user)):
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill

    wb = Workbook()
    ws = wb.active
    ws.title = "Members Template"
    headers = ["Member ID", "Full Name", "Primary Mobile", "Secondary Mobile", "Status"]
    ws.append(headers)

    header_fill = PatternFill(start_color="CF2030", end_color="CF2030", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font

    ws.append(["01", "Sample Member 1", "9876543210", "9123456789", "Active"])
    ws.append(["02", "Sample Member 2", "9999888877", "", "Active"])

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=members_template.xlsx"})


@router.post("/admin/members/upload")
async def upload_members_excel(file: UploadFile = File(...), user=Depends(get_current_user)):
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    from openpyxl import load_workbook
    from uuid import uuid4

    contents = await file.read()
    wb = load_workbook(io.BytesIO(contents))
    ws = wb.active
    members_data = []
    errors = []
    skipped = []
    duplicate_mobiles = []

    existing_members = await db.members.find({"chapter_id": user["chapter_id"]}, {"unique_member_id": 1, "primary_mobile": 1}).to_list(1000)
    existing_ids = {m.get("unique_member_id") for m in existing_members}
    existing_mobiles = {m.get("primary_mobile") for m in existing_members}

    for idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        if not row[0] or not row[1] or not row[2]:
            continue
        unique_member_id = str(row[0])
        full_name = str(row[1])
        primary_mobile = str(row[2])
        secondary_mobile = str(row[3]) if row[3] else None
        status = str(row[4]) if row[4] else "Active"

        if unique_member_id in existing_ids:
            skipped.append(f"Row {idx}: Member ID {unique_member_id} already exists")
            continue
        if primary_mobile in existing_mobiles:
            skipped.append(f"Row {idx}: Mobile {primary_mobile} already exists")
            duplicate_mobiles.append(primary_mobile)
            continue

        batch_ids = {m["unique_member_id"] for m in members_data}
        batch_mobiles = {m["primary_mobile"] for m in members_data}
        if unique_member_id in batch_ids:
            skipped.append(f"Row {idx}: Duplicate Member ID {unique_member_id} in Excel file")
            continue
        if primary_mobile in batch_mobiles:
            skipped.append(f"Row {idx}: Duplicate Mobile {primary_mobile} in Excel file")
            continue

        try:
            member_data = {
                "member_id": str(uuid4()), "chapter_id": user["chapter_id"],
                "unique_member_id": unique_member_id, "full_name": full_name,
                "primary_mobile": primary_mobile, "secondary_mobile": secondary_mobile,
                "status": status, "created_at": datetime.now(timezone.utc).isoformat(),
                "bni_member_id": unique_member_id, "organization_id": user["chapter_id"],
            }
            members_data.append(member_data)
            existing_ids.add(unique_member_id)
            existing_mobiles.add(primary_mobile)
        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")

    inserted_count = 0
    for idx, member_data in enumerate(members_data):
        try:
            await db.members.insert_one(member_data)
            inserted_count += 1
        except Exception as e:
            errors.append(f"Insert error for row {idx+2}: {str(e)}")

    return {
        "message": f"{inserted_count} members uploaded successfully", "total": len(members_data),
        "duplicate_mobiles": duplicate_mobiles, "skipped": len(skipped), "errors": errors,
        "skipped_details": skipped if skipped else None
    }


@router.put("/admin/members/{member_id}", response_model=MemberResponse)
async def update_member(member_id: str, member: MemberUpdate, user=Depends(get_current_user)):
    if user["role"] not in ("admin", "superadmin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    chapter_id = user.get("chapter_id")
    query = {"member_id": member_id}
    if chapter_id:
        query["chapter_id"] = chapter_id

    update_data = {k: v for k, v in member.dict(exclude_unset=True).items()}
    result = await db.members.update_one(query, {"$set": update_data})

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")

    updated_member = await db.members.find_one({"member_id": member_id}, {"_id": 0})
    return MemberResponse(**updated_member)


@router.delete("/admin/members/{member_id}")
async def delete_member(member_id: str, user=Depends(get_current_user)):
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await db.members.delete_one({"member_id": member_id, "chapter_id": user["chapter_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member deleted successfully"}
