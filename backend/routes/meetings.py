# MAX 400 LINES - Split into separate route files if exceeding
"""Meeting management: create/delete meetings, QR codes, attendance, reports."""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone, timedelta
from database import db
from deps import get_current_user
from models import MeetingCreate, MeetingResponse, AttendanceResponse, List
from qr_generator import generate_qr_token, create_qr_image
from report_generator import generate_excel_report, generate_pdf_report
import io
import pytz

IST = pytz.timezone('Asia/Kolkata')

router = APIRouter(prefix="/api", tags=["meetings"])

@router.post("/admin/meetings", response_model=MeetingResponse)
async def create_meeting(meeting: MeetingCreate, user=Depends(get_current_user)):
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")
    
    meeting_id = f"MT{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    
    # Generate single QR token (type will be selected manually in form)
    qr_token = generate_qr_token(meeting_id, user["chapter_id"], "all")
    
    meeting_data = {
        "meeting_id": meeting_id,
        "chapter_id": user["chapter_id"],
        "date": meeting.date,
        "start_time": meeting.start_time,
        "late_cutoff_time": meeting.late_cutoff_time,
        "end_time": meeting.end_time,
        "qr_token": qr_token,
        "qr_expires_at": (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.meetings.insert_one(meeting_data)
    return MeetingResponse(**meeting_data)

@router.get("/admin/meetings", response_model=List[MeetingResponse])
async def get_meetings(user=Depends(get_current_user)):
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")
    
    meetings = await db.meetings.find({"chapter_id": user["chapter_id"]}, {"_id": 0}).to_list(1000)
    return meetings

@router.put("/admin/meetings/{meeting_id}/archive")
async def archive_meeting(meeting_id: str, user=Depends(get_current_user)):
    """Archive a meeting — sets status to 'archived'. Attendance records are preserved."""
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    meeting = await db.meetings.find_one(
        {"meeting_id": meeting_id, "chapter_id": user["chapter_id"]}, {"_id": 0}
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    new_status = "active" if meeting.get("status") == "archived" else "archived"
    await db.meetings.update_one(
        {"meeting_id": meeting_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Meeting {'restored' if new_status == 'active' else 'archived'} successfully", "new_status": new_status}

@router.get("/admin/meetings/{meeting_id}/qr")
async def get_qr_code(meeting_id: str, request: Request, user=Depends(get_current_user)):
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")
    
    meeting = await db.meetings.find_one({"meeting_id": meeting_id, "chapter_id": user["chapter_id"]}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Check if QR expired, regenerate if needed
    qr_expires = datetime.fromisoformat(meeting["qr_expires_at"])
    if datetime.now(timezone.utc) >= qr_expires:
        new_token = generate_qr_token(meeting_id, user["chapter_id"], "all")
        new_expiry = (datetime.now(timezone.utc) + timedelta(seconds=10)).isoformat()
        await db.meetings.update_one(
            {"meeting_id": meeting_id},
            {"$set": {"qr_token": new_token, "qr_expires_at": new_expiry}}
        )
        meeting["qr_token"] = new_token
    
    # Always use FRONTEND_URL for QR code generation
    # This ensures QR codes always point to the custom domain (e.g., aasaanapp.com)
    # regardless of which domain the admin panel is accessed from
    qr_image = create_qr_image(meeting["qr_token"], request_host=None)
    return StreamingResponse(io.BytesIO(qr_image), media_type="image/png")

@router.get("/admin/meetings/{meeting_id}/attendance", response_model=List[AttendanceResponse])
async def get_attendance(meeting_id: str, user=Depends(get_current_user)):
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    # Verify meeting belongs to user's chapter
    meeting = await db.meetings.find_one({"meeting_id": meeting_id, "chapter_id": user["chapter_id"]}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    attendance = await db.attendance.find({
        "meeting_id": meeting_id,
        "approval_status": "approved"
    }, {"_id": 0}).to_list(1000)
    return attendance

@router.get("/admin/meetings/{meeting_id}/summary")
async def get_meeting_summary(meeting_id: str, user=Depends(get_current_user)):
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # Get meeting details
    meeting = await db.meetings.find_one({"meeting_id": meeting_id, "chapter_id": user["chapter_id"]}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Get all ACTIVE members for this chapter
    members = await db.members.find({"chapter_id": user["chapter_id"], "status": "Active"}, {"_id": 0}).to_list(1000)
    total_members = len(members)

    # Get all attendance for this meeting
    attendance = await db.attendance.find({"meeting_id": meeting_id}, {"_id": 0}).to_list(1000)
    
    # Count members and substitutes
    member_attendance = [a for a in attendance if a["type"] == "member"]
    substitute_attendance = [a for a in attendance if a["type"] == "substitute"]
    visitor_attendance = [a for a in attendance if a["type"] == "visitor"]
    
    present_count = len(member_attendance)
    substitute_count = len(substitute_attendance)
    visitor_count = len(visitor_attendance)
    
    # Check if meeting has ended — times stored as HH:MM strings
    def _parse_meeting_dt(date_str, time_str):
        """Combine date 'YYYY-MM-DD' and time 'HH:MM' into IST datetime."""
        try:
            return IST.localize(datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M"))
        except (ValueError, TypeError):
            # Fallback: try ISO format (full datetime string)
            dt = datetime.fromisoformat(time_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(IST)

    end_time = _parse_meeting_dt(meeting["date"], meeting["end_time"])
    now_ist = datetime.now(IST)
    meeting_ended = now_ist > end_time
    
    # Build detailed lists for Quick View
    # 1. All members list
    all_members = []
    for member in members:
        all_members.append({
            "unique_member_id": member["unique_member_id"],
            "full_name": member["full_name"],
            "primary_mobile": member.get("primary_mobile", ""),
            "status": "Active"
        })
    
    # 2. Present members list (with timestamp)
    present_members = []
    for att in member_attendance:
        member_info = next((m for m in members if m["unique_member_id"] == att.get("unique_member_id")), None)
        present_members.append({
            "unique_member_id": att.get("unique_member_id"),
            "full_name": member_info["full_name"] if member_info else att.get("member_name", "Unknown"),
            "timestamp": att.get("timestamp"),
            "status": "Present"
        })
    
    # 3. Substitute members list (with substitute name)
    substitute_members = []
    for att in substitute_attendance:
        member_info = next((m for m in members if m["unique_member_id"] == att.get("unique_member_id")), None)
        substitute_members.append({
            "unique_member_id": att.get("unique_member_id"),
            "full_name": member_info["full_name"] if member_info else att.get("member_name", "Unknown"),
            "substitute_name": att.get("substitute_name", ""),
            "substitute_mobile": att.get("substitute_mobile", ""),
            "timestamp": att.get("timestamp"),
            "status": "Substitute"
        })
    
    # 4. Visitors list
    visitors = []
    for att in visitor_attendance:
        visitors.append({
            "visitor_name": att.get("visitor_name", ""),
            "company": att.get("company_name", att.get("visitor_company", "")),
            "mobile": att.get("visitor_mobile", ""),
            "invited_by": att.get("invited_by", ""),
            "timestamp": att.get("timestamp"),
            "status": "Visitor"
        })
    
    # 5. Pending/Absent members
    attended_member_ids = {a.get("unique_member_id") for a in attendance if a["type"] in ["member", "substitute"] and a.get("unique_member_id")}
    pending_members = []
    
    for member in members:
        if member["unique_member_id"] not in attended_member_ids:
            pending_members.append({
                "unique_member_id": member["unique_member_id"],
                "full_name": member["full_name"],
                "primary_mobile": member.get("primary_mobile", ""),
                "status": "Absent" if meeting_ended else "Pending"
            })
    
    absent_count = len(pending_members) if meeting_ended else 0
    pending_count = len(pending_members) if not meeting_ended else 0
    
    return {
        "total_members": total_members,
        "present_count": present_count,
        "substitute_count": substitute_count,
        "visitor_count": visitor_count,
        "absent_count": absent_count,
        "pending_count": pending_count,
        "meeting_ended": meeting_ended,
        "pending_members": pending_members,
        # Detailed lists for Quick View
        "all_members": all_members,
        "present_members": present_members,
        "substitute_members": substitute_members,
        "visitors": visitors
    }

@router.get("/admin/attendance/pending", response_model=List[AttendanceResponse])
async def get_pending_attendance(user=Depends(get_current_user)):
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # Get all pending attendance for this chapter
    pending = await db.attendance.find({
        "approval_status": "pending"
    }, {"_id": 0}).to_list(1000)
    
    # Filter by chapter - get meeting IDs for this chapter
    meetings = await db.meetings.find({"chapter_id": user["chapter_id"]}, {"_id": 0, "meeting_id": 1}).to_list(1000)
    meeting_ids = [m["meeting_id"] for m in meetings]
    
    # Filter pending attendance by chapter meetings
    chapter_pending = [att for att in pending if att["meeting_id"] in meeting_ids]
    
    return chapter_pending

@router.post("/admin/attendance/{attendance_id}/approve")
async def approve_attendance(attendance_id: str, user=Depends(get_current_user)):
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    # Verify attendance belongs to a meeting in user's chapter
    att = await db.attendance.find_one({"attendance_id": attendance_id}, {"_id": 0, "meeting_id": 1})
    if not att:
        raise HTTPException(status_code=404, detail="Attendance not found")
    meeting = await db.meetings.find_one({"meeting_id": att["meeting_id"], "chapter_id": user["chapter_id"]}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Attendance not found")

    await db.attendance.update_one(
        {"attendance_id": attendance_id},
        {"$set": {"approval_status": "approved"}}
    )
    return {"message": "Attendance approved successfully"}

@router.post("/admin/attendance/{attendance_id}/reject")
async def reject_attendance(attendance_id: str, user=Depends(get_current_user)):
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    # Verify attendance belongs to a meeting in user's chapter
    att = await db.attendance.find_one({"attendance_id": attendance_id}, {"_id": 0, "meeting_id": 1})
    if not att:
        raise HTTPException(status_code=404, detail="Attendance not found")
    meeting = await db.meetings.find_one({"meeting_id": att["meeting_id"], "chapter_id": user["chapter_id"]}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Attendance not found")

    await db.attendance.update_one(
        {"attendance_id": attendance_id},
        {"$set": {"approval_status": "rejected"}}
    )
    return {"message": "Attendance rejected successfully"}

@router.post("/admin/meetings/{meeting_id}/mark-manual")
async def mark_manual_attendance(meeting_id: str, request: Request, user=Depends(get_current_user)):
    """Mark attendance manually — for role holders when member cannot scan QR."""
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    meeting = await db.meetings.find_one({"meeting_id": meeting_id, "chapter_id": user["chapter_id"]}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    body = await request.json()
    unique_member_id = body.get("unique_member_id")
    if not unique_member_id:
        raise HTTPException(status_code=400, detail="unique_member_id is required")

    # Duplicate check
    existing = await db.attendance.find_one({"meeting_id": meeting_id, "unique_member_id": unique_member_id})
    if existing:
        raise HTTPException(status_code=400, detail="Attendance already marked for this member")

    attendance_id = f"ATT{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')[:20]}"
    att_data = {
        "attendance_id": attendance_id,
        "meeting_id": meeting_id,
        "chapter_id": user["chapter_id"],
        "unique_member_id": unique_member_id,
        "type": body.get("type", "member"),
        "member_name": body.get("member_name", ""),
        "primary_mobile": body.get("primary_mobile", ""),
        "substitute_name": body.get("substitute_name", ""),
        "substitute_mobile": body.get("substitute_mobile", ""),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "approval_status": "approved",
        "method": "manual",
        "marked_by": user.get("member_name", user.get("mobile", "")),
        "reason": body.get("reason", ""),
    }
    await db.attendance.insert_one(att_data)
    return {"message": "Attendance marked manually", "attendance_id": attendance_id}

@router.get("/admin/meetings/{meeting_id}/report/excel")
async def download_excel_report(meeting_id: str, user=Depends(get_current_user)):
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")
    
    meeting = await db.meetings.find_one({"meeting_id": meeting_id, "chapter_id": user["chapter_id"]}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    chapter = await db.chapters.find_one({"chapter_id": user["chapter_id"]}, {"_id": 0, "name": 1})
    chapter_name = chapter.get("name", "") if chapter else ""

    members = await db.members.find({"chapter_id": user["chapter_id"]}, {"_id": 0}).to_list(1000)
    attendance = await db.attendance.find({"meeting_id": meeting_id}, {"_id": 0}).to_list(1000)

    excel_file = generate_excel_report(meeting, members, attendance, chapter_name)

    return StreamingResponse(
        io.BytesIO(excel_file),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=attendance_{meeting_id}.xlsx"}
    )

@router.get("/admin/meetings/{meeting_id}/report/pdf")
async def download_pdf_report(meeting_id: str, user=Depends(get_current_user)):
    if user["role"] not in ("admin", "developer"):
        raise HTTPException(status_code=403, detail="Forbidden")

    meeting = await db.meetings.find_one({"meeting_id": meeting_id, "chapter_id": user["chapter_id"]}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    chapter = await db.chapters.find_one({"chapter_id": user["chapter_id"]}, {"_id": 0, "name": 1})
    chapter_name = chapter.get("name", "") if chapter else ""
    
    members = await db.members.find({"chapter_id": user["chapter_id"]}, {"_id": 0}).to_list(1000)
    attendance = await db.attendance.find({"meeting_id": meeting_id}, {"_id": 0}).to_list(1000)
    
    pdf_file = generate_pdf_report(meeting, members, attendance, chapter_name)
    
    return StreamingResponse(
        io.BytesIO(pdf_file),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=attendance_{meeting_id}.pdf"}
    )

