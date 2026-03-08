# MAX 400 LINES - Split into separate route files if exceeding
"""Public endpoints: QR verification, attendance form (no auth required)."""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from database import db
from models import AttendanceCreate, AttendanceResponse
from qr_generator import verify_qr_token
import pytz

IST = pytz.timezone('Asia/Kolkata')

router = APIRouter(prefix="/api", tags=["public"])


# ===== APP VERSION (public, no auth) =====
@router.get("/app/version")
async def get_app_version():
    """Returns latest app version info for PWA update check."""
    config = await db.app_config.find_one({"config_id": "app_version"}, {"_id": 0})
    if not config:
        return {
            "latest_version": "1.0.0",
            "min_supported_version": "1.0.0",
            "force_update": False,
            "update_message": "",
            "release_notes": "",
        }
    return {
        "latest_version": config.get("latest_version", "1.0.0"),
        "min_supported_version": config.get("min_supported_version", "1.0.0"),
        "force_update": config.get("force_update", False),
        "update_message": config.get("update_message", ""),
        "release_notes": config.get("release_notes", ""),
    }


# ===== PUBLIC ENDPOINTS =====
@router.get("/qr/verify/{token}")
async def verify_qr(token: str):
    payload = verify_qr_token(token)
    if not payload:
        raise HTTPException(status_code=400, detail="Invalid or expired QR code")
    
    meeting = await db.meetings.find_one({"meeting_id": payload["meeting_id"]}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Check if meeting time window is valid
    now_ist = datetime.now(IST)
    start_time = datetime.fromisoformat(meeting["start_time"]).replace(tzinfo=timezone.utc).astimezone(IST)
    end_time = datetime.fromisoformat(meeting["end_time"]).replace(tzinfo=timezone.utc).astimezone(IST)
    
    # Meeting hasn't started yet
    if now_ist < start_time:
        raise HTTPException(
            status_code=400,
            detail=f"Meeting hasn't started yet. Opens at {start_time.strftime('%I:%M %p on %d %B %Y')}"
        )
    
    # Meeting has ended
    if now_ist > end_time:
        raise HTTPException(status_code=400, detail="Meeting has ended. QR code expired.")
    
    return {
        "meeting_id": meeting["meeting_id"],
        "chapter_id": meeting["chapter_id"],
        "date": meeting["date"],
        "start_time": meeting["start_time"],
        "end_time": meeting["end_time"],
        "attendance_type": payload.get("attendance_type", "member")  # Return type from token
    }

@router.get("/members/{chapter_id}")
async def get_chapter_members(chapter_id: str):
    """Public endpoint to get members list for attendance form - sorted alphabetically by name (A-Z)"""
    members = await db.members.find(
        {"chapter_id": chapter_id, "status": "Active"}, 
        {"_id": 0, "member_id": 1, "unique_member_id": 1, "full_name": 1, "primary_mobile": 1}
    ).to_list(1000)
    
    # Sort alphabetically by full_name (case-insensitive A-Z)
    members.sort(key=lambda x: (x.get("full_name") or "").lower())
    return members

@router.post("/attendance/mark", response_model=AttendanceResponse)
async def mark_attendance(attendance: AttendanceCreate):
    # Guard: Members must use the in-app scanner, not the public form
    if attendance.type == "member":
        raise HTTPException(
            status_code=400,
            detail="Member attendance must be marked through the AasaanApp. Please open your app and use Scan QR."
        )

    meeting = await db.meetings.find_one({"meeting_id": attendance.meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Use IST timezone
    now_ist = datetime.now(IST)
    
    meeting_date = datetime.fromisoformat(meeting["date"]).replace(tzinfo=timezone.utc).astimezone(IST)
    start_time = datetime.fromisoformat(meeting["start_time"]).replace(tzinfo=timezone.utc).astimezone(IST)
    late_cutoff = datetime.fromisoformat(meeting["late_cutoff_time"]).replace(tzinfo=timezone.utc).astimezone(IST)
    end_time = datetime.fromisoformat(meeting["end_time"]).replace(tzinfo=timezone.utc).astimezone(IST)
    
    # Check if attendance window is valid - must be between start and end time
    if now_ist < start_time:
        raise HTTPException(
            status_code=400, 
            detail=f"Attendance window not yet open. Meeting starts at {start_time.strftime('%I:%M %p on %d %B %Y')}"
        )
    
    if now_ist > end_time:
        raise HTTPException(status_code=400, detail="Attendance window closed")
    
    # Member validation and duplicate check
    member = None
    approval_status = "approved"  # All attendance auto-approved now
    
    if attendance.type == "member":
        member = await db.members.find_one({"unique_member_id": attendance.unique_member_id}, {"_id": 0})
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        
        # Check if member already marked attendance (device_fingerprint removed from duplicate check to fix iPhone false positives)
        existing = await db.attendance.find_one({
            "meeting_id": attendance.meeting_id,
            "$or": [
                {"primary_mobile": attendance.primary_mobile},
                {"unique_member_id": attendance.unique_member_id}
            ]
        })
        if existing:
            raise HTTPException(status_code=400, detail="Attendance already marked for this member")
    
    # For substitute - check if member already attended
    if attendance.type == "substitute":
        member = await db.members.find_one({"unique_member_id": attendance.unique_member_id}, {"_id": 0})
        if not member:
            raise HTTPException(status_code=404, detail="Member ID not found")
        
        # Check if member already marked attendance
        existing = await db.attendance.find_one({
            "meeting_id": attendance.meeting_id,
            "unique_member_id": attendance.unique_member_id
        })
        if existing:
            raise HTTPException(status_code=400, detail=f"Member {attendance.unique_member_id} has already marked attendance")
        
        # Also check if member's primary mobile was used
        existing_mobile = await db.attendance.find_one({
            "meeting_id": attendance.meeting_id,
            "primary_mobile": member["primary_mobile"]
        })
        if existing_mobile:
            raise HTTPException(status_code=400, detail=f"Member {attendance.unique_member_id}'s mobile number already used for attendance")
    
    # Determine status and late type based on cutoff time
    status = "Present"
    late_type = None
    
    if now_ist <= late_cutoff:
        late_type = "On time"
    else:
        late_type = "Late"
    
    # Get invited by member name for visitors - CRITICAL: Filter by chapter_id to avoid cross-chapter data
    invited_by_member_name = None
    if attendance.type == "visitor" and attendance.invited_by_member_id:
        invited_member = await db.members.find_one(
            {
                "unique_member_id": attendance.invited_by_member_id,
                "chapter_id": meeting["chapter_id"]  # CRITICAL: Must filter by chapter_id
            }, 
            {"_id": 0, "full_name": 1}
        )
        if invited_member:
            invited_by_member_name = invited_member["full_name"]
    
    attendance_data = {
        "attendance_id": f"A{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
        "meeting_id": attendance.meeting_id,
        "unique_member_id": attendance.unique_member_id if attendance.type in ["member", "substitute"] else None,
        "type": attendance.type,
        "status": status,
        "timestamp": now_ist.isoformat(),
        "late_type": late_type,
        "member_name": member.get("full_name") if member else None,
        "primary_mobile": attendance.primary_mobile if attendance.type == "member" else None,
        "substitute_name": attendance.substitute_name,
        "substitute_mobile": attendance.substitute_mobile,
        "visitor_name": attendance.visitor_name,
        "visitor_mobile": attendance.visitor_mobile,
        "visitor_email": attendance.visitor_email,
        "visitor_company": attendance.visitor_company,
        "visitor_business_category": attendance.visitor_business_category,
        "invited_by_member_id": attendance.invited_by_member_id,
        "invited_by_member_name": invited_by_member_name,
        "device_fingerprint": attendance.device_fingerprint,
        "ip_address": attendance.ip_address,
        "approval_status": approval_status
    }
    
    await db.attendance.insert_one(attendance_data)
    return AttendanceResponse(**attendance_data)

