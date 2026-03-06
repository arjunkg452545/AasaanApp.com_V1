# MAX 400 LINES - Fund report PDF export
"""Fund report PDF export with date filter, category filter, payment status filter."""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime
from typing import Optional
from database import db
from deps import get_current_user
import pytz
import io

IST = pytz.timezone('Asia/Kolkata')

router = APIRouter(prefix="/api", tags=["fund-reports-pdf"])


# Fund Report Export - PDF with Date Filter
@router.get("/admin/fund/reports/export/pdf")
async def export_fund_report_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    months: Optional[str] = None,
    year: Optional[int] = None,
    category: Optional[str] = None,
    categories: Optional[str] = None,
    payment_status: Optional[str] = None,
    event_id: Optional[str] = None,
    user = Depends(get_current_user)
):
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER

    chapter_id = user.get("chapter_id")
    chapter_name = user.get("chapter_name", "Chapter")

    # Parse filters with proper year handling
    current_year = datetime.now().year
    current_month = datetime.now().month
    filter_year = year or current_year

    # Month-year list: Store tuples of (month, year) for proper cross-year handling
    month_year_list = []

    if months:
        # Validate month range 1-12
        month_list = [int(m.strip()) for m in months.split(",") if m.strip().isdigit()]
        month_year_list = [(m, filter_year) for m in month_list if 1 <= m <= 12]
    else:
        # Default to last 3 months with proper year handling
        for i in range(3):
            m = current_month - i
            y = current_year
            if m <= 0:
                m += 12
                y -= 1
            month_year_list.append((m, y))
        month_year_list.reverse()

    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    # Build filter description with year for each month
    filter_parts = []
    for m, y in month_year_list:
        filter_parts.append(f"{month_names[m-1]}'{str(y)[-2:]}")
    filter_desc = ', '.join(filter_parts)

    # Categories
    cat_list = []
    if categories:
        cat_list = [c.strip() for c in categories.split(',')]
    elif category and category != 'all':
        cat_list = [category]

    include_kitty = len(cat_list) == 0 or 'kitty' in cat_list
    include_meetingfee = len(cat_list) == 0 or 'meetingfee' in cat_list
    include_events = len(cat_list) == 0 or 'events' in cat_list

    category_desc = ""
    if cat_list:
        cat_names = {'kitty': 'Kitty', 'meetingfee': 'M.Fee', 'events': 'Events'}
        category_desc = f" - {', '.join([cat_names.get(c, c) for c in cat_list])}"

    status_desc = ""
    if payment_status and payment_status != 'all':
        status_desc = f" ({payment_status.capitalize()})"

    # Get data
    members = await db.members.find({"chapter_id": chapter_id, "status": "Active"}, {"_id": 0}).to_list(500)

    all_kitty = await db.kitty_payments.find({"chapter_id": chapter_id, "status": "paid"}, {"_id": 0}).to_list(5000)
    all_kitty_settings = await db.kitty_settings.find({"chapter_id": chapter_id}, {"_id": 0}).to_list(100)
    kitty_setting_map = {(s["month"], s["year"]): s.get("amount", 0) for s in all_kitty_settings}

    all_meetingfee = await db.meetingfee_payments.find({"chapter_id": chapter_id, "status": "paid"}, {"_id": 0}).to_list(5000)
    all_mf_settings = await db.meetingfee_settings.find({"chapter_id": chapter_id}, {"_id": 0}).to_list(100)
    mf_setting_map = {(s["month"], s["year"]): s.get("amount", 0) for s in all_mf_settings}

    all_events = await db.fund_events.find({"chapter_id": chapter_id}, {"_id": 0}).to_list(100)
    all_event_payments = await db.event_payments.find({"status": "paid"}, {"_id": 0}).to_list(5000)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), topMargin=15, bottomMargin=15, leftMargin=10, rightMargin=10)
    elements = []
    styles = getSampleStyleSheet()

    # Title
    title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=14, alignment=TA_CENTER)
    elements.append(Paragraph(f"FUND REPORT - {chapter_name}{category_desc}{status_desc}", title_style))
    elements.append(Paragraph(f"Period: {filter_desc} | Generated: {datetime.now(IST).strftime('%d-%b-%Y %H:%M')}", styles['Normal']))
    elements.append(Spacer(1, 5*mm))

    # Build headers with proper month-year
    headers = ["Sr", "Name"]
    if include_kitty:
        for m, y in month_year_list:
            headers.append(f"K-{month_names[m-1][:3]}'{str(y)[-2:]}")
        headers.append("K.Tot")
    if include_meetingfee:
        for m, y in month_year_list:
            headers.append(f"MF-{month_names[m-1][:3]}'{str(y)[-2:]}")
        headers.append("MF.Tot")
    if include_events:
        headers.append("Events")
    headers.append("Total")
    headers.append("Status")

    table_data = [headers]
    grand_totals = {"kitty": 0, "mf": 0, "event": 0, "grand": 0}

    # Summary tracking for PDF
    summary_data = {
        "total_members": len(members),
        "paid_members": 0,
        "pending_members": 0,
        "kitty_months_collected": {(m, y): 0 for m, y in month_year_list},
        "kitty_months_pending": {(m, y): 0 for m, y in month_year_list},
        "kitty_pending_total": 0,
        "mf_months_collected": {(m, y): 0 for m, y in month_year_list},
        "mf_months_pending": {(m, y): 0 for m, y in month_year_list},
        "mf_pending_total": 0,
        "event_pending_total": 0,
        "total_pending": 0
    }

    for idx, member in enumerate(members, 1):
        member_id = member["member_id"]
        row_data = [idx, member.get("full_name", "")[:15]]

        kitty_total = 0
        mf_total = 0
        event_total = 0
        pending = 0

        if include_kitty:
            for m, y in month_year_list:
                paid = sum(k.get("amount", 0) for k in all_kitty if k.get("member_id") == member_id and k.get("month") == m and k.get("year") == y)
                expected = kitty_setting_map.get((m, y), 0)
                row_data.append(paid if paid > 0 else ("-" if expected == 0 else "P"))
                kitty_total += paid
                summary_data["kitty_months_collected"][(m, y)] += paid
                if paid == 0 and expected > 0:
                    pending += expected
                    summary_data["kitty_months_pending"][(m, y)] += expected
                    summary_data["kitty_pending_total"] += expected
            row_data.append(kitty_total)
            grand_totals["kitty"] += kitty_total

        if include_meetingfee:
            for m, y in month_year_list:
                paid = sum(mf.get("amount", 0) for mf in all_meetingfee if mf.get("member_id") == member_id and mf.get("month") == m and mf.get("year") == y)
                expected = mf_setting_map.get((m, y), 0)
                row_data.append(paid if paid > 0 else ("-" if expected == 0 else "P"))
                mf_total += paid
                summary_data["mf_months_collected"][(m, y)] += paid
                if paid == 0 and expected > 0:
                    pending += expected
                    summary_data["mf_months_pending"][(m, y)] += expected
                    summary_data["mf_pending_total"] += expected
            row_data.append(mf_total)
            grand_totals["mf"] += mf_total

        if include_events:
            for event in all_events:
                if not event_id or event["event_id"] == event_id:
                    ev_paid = [ep for ep in all_event_payments if ep.get("member_id") == member_id and ep.get("event_id") == event["event_id"]]
                    if ev_paid:
                        event_total += event.get("amount", 0)
                    else:
                        pending += event.get("amount", 0)
                        summary_data["event_pending_total"] += event.get("amount", 0)
            row_data.append(event_total)
            grand_totals["event"] += event_total

        total = kitty_total + mf_total + event_total
        row_data.append(total)
        grand_totals["grand"] += total

        # Track member paid/pending status for summary
        if pending > 0:
            summary_data["pending_members"] += 1
            summary_data["total_pending"] += pending
        elif total > 0:
            summary_data["paid_members"] += 1

        # Status
        if pending > 0:
            row_data.append(f"P:{pending}")
        elif total > 0:
            row_data.append("OK")
        else:
            row_data.append("-")

        # Filter by payment status
        if payment_status == 'paid' and pending > 0:
            continue
        if payment_status == 'pending' and pending == 0:
            continue

        table_data.append(row_data)

    # Total row
    total_row = ["", "TOTAL"]
    if include_kitty:
        total_row.extend([""] * len(month_year_list))
        total_row.append(grand_totals["kitty"])
    if include_meetingfee:
        total_row.extend([""] * len(month_year_list))
        total_row.append(grand_totals["mf"])
    if include_events:
        total_row.append(grand_totals["event"])
    total_row.append(grand_totals["grand"])
    total_row.append("")
    table_data.append(total_row)

    # Calculate column widths
    num_cols = len(headers)
    base_width = 750 / num_cols
    col_widths = [20, 80] + [min(base_width, 35)] * (num_cols - 2)

    # Create table
    table = Table(table_data, colWidths=col_widths)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, -1), (-1, -1), colors.yellow),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    ]))

    elements.append(table)

    # Legend
    elements.append(Spacer(1, 5*mm))
    elements.append(Paragraph("Legend: P = Pending, OK = Paid, - = No Activity", styles['Normal']))

    # ========== SUMMARY SECTION FOR PDF ==========
    elements.append(Spacer(1, 8*mm))

    summary_title_style = ParagraphStyle('SummaryTitle', parent=styles['Heading2'], fontSize=12, alignment=TA_CENTER)
    elements.append(Paragraph("═══════ SUMMARY ═══════", summary_title_style))
    elements.append(Spacer(1, 4*mm))

    # Summary Table Data
    summary_table_data = []

    # Member Status Section
    summary_table_data.append(["MEMBER STATUS", "", "", ""])
    summary_table_data.append(["Total Members", str(summary_data['total_members']), "Fully Paid", str(summary_data['paid_members'])])
    summary_table_data.append(["Pending Members", str(summary_data['pending_members']), "", ""])
    summary_table_data.append(["", "", "", ""])

    # Category-wise Collection Section
    summary_table_data.append(["CATEGORY-WISE COLLECTION", "Collected (Rs.)", "Pending (Rs.)", ""])
    if include_kitty:
        summary_table_data.append(["Kitty", str(grand_totals['kitty']), str(summary_data['kitty_pending_total']), ""])
    if include_meetingfee:
        summary_table_data.append(["Meeting Fee", str(grand_totals['mf']), str(summary_data['mf_pending_total']), ""])
    if include_events:
        summary_table_data.append(["Events", str(grand_totals['event']), str(summary_data['event_pending_total']), ""])
    summary_table_data.append(["GRAND TOTAL", str(grand_totals['grand']), str(summary_data['total_pending']), ""])
    summary_table_data.append(["", "", "", ""])

    # Month-wise Breakdown Section
    summary_table_data.append(["MONTH-WISE BREAKDOWN", "Collected (Rs.)", "Pending (Rs.)", ""])
    for m, y in month_year_list:
        month_collected = summary_data["kitty_months_collected"].get((m, y), 0) + summary_data["mf_months_collected"].get((m, y), 0)
        month_pending = summary_data["kitty_months_pending"].get((m, y), 0) + summary_data["mf_months_pending"].get((m, y), 0)
        summary_table_data.append([f"{month_names[m-1]} {y}", str(month_collected), str(month_pending), ""])

    # Create Summary Table
    summary_table = Table(summary_table_data, colWidths=[120, 80, 80, 50])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.9, 0.95, 1)),  # Light blue for section headers
        ('BACKGROUND', (0, 4), (-1, 4), colors.Color(0.9, 0.95, 1)),
        ('BACKGROUND', (0, len(summary_table_data)-len(month_year_list)-1), (-1, len(summary_table_data)-len(month_year_list)-1), colors.Color(0.9, 0.95, 1)),
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 4), (0, 4), 'Helvetica-Bold'),
        ('FONTNAME', (0, len(summary_table_data)-len(month_year_list)-1), (0, len(summary_table_data)-len(month_year_list)-1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, 3+len([c for c in [include_kitty, include_meetingfee, include_events] if c])+1), (-1, 3+len([c for c in [include_kitty, include_meetingfee, include_events] if c])+1), colors.yellow),  # Grand total row
        ('FONTNAME', (0, 3+len([c for c in [include_kitty, include_meetingfee, include_events] if c])+1), (-1, 3+len([c for c in [include_kitty, include_meetingfee, include_events] if c])+1), 'Helvetica-Bold'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))

    elements.append(summary_table)

    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=fund_report_{chapter_id}.pdf"}
    )
