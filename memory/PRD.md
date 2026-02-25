# BNI Management System - Product Requirements Document

## Original Problem Statement
Build a Progressive Web App (PWA) for a QR-code-based attendance system for BNI chapters with:
- Super Admin and Chapter Admin roles
- QR-based attendance marking
- Excel/PDF reporting
- Fund Management module

## User Personas
1. **Super Admin**: Manages chapters, creates chapter admins
2. **Chapter Admin**: Manages members, meetings, attendance, and funds
3. **Members**: Mark attendance via QR scan

## Core Requirements

### Authentication & Roles
- Super Admin login with mobile/password
- Chapter Admin login with mobile/password
- JWT-based authentication

### Meeting Management
- Create meetings with date/time
- Generate QR codes for attendance
- Real-time attendance tracking
- Manual attendance marking
- Substitute member support
- Visitor tracking

### Fund Management (Restructured)
1. **Kitty Payments** - Monthly contribution with per-member amount setting
2. **Meeting Fees** - Monthly meeting fee (replaces Miscellaneous)
3. **Event Payments** - Event-based collections

#### Key Features:
- Separate cards for Kitty, Meeting Fees, Events
- Paid/Pending summary popup with member lists
- Per-member amount editing capability
- Checkbox-based member selection for payments
- Category-wise filter in reports (Kitty/Meeting Fees/Events/All)
- Excel/PDF export with category filter

### Reports
- Attendance reports (date-wise, month-wise)
- Fund reports with filters
- Excel & PDF export

## What's Been Implemented

### January 8, 2026 (Session 3)
- [x] **Custom Month Range** - Duration filter update:
  - "Custom Date Range" → "Custom Month Range"
  - Month + Year dropdowns instead of date pickers
  - From Month/Year and To Month/Year selection
  - Works for multi-month ranges (e.g., April 2025 to December 2025)
- [x] **Payment Mode Column in Meeting Fee Reports ONLY**:
  - Added "Pay Mode" column in Meeting Fee reports (Preview, PDF, Excel)
  - Shows actual payment mode (Cash/UPI/NEFT/Cheque) for Paid status
  - Shows "-" (dash) for Pending status
  - NOT added to Kitty or Events reports (as per requirement)
- [x] **Individual Member Amount Edit Feature**:
  - Edit button (✎) positioned RIGHT NEXT TO amount
  - Edit works for PENDING members (before payment)
  - Edit works for PAID members (for corrections)
  - Amount updates immediately in UI after edit
  - Amount saves to database (member_amounts collection)
- [x] **Target Amount Calculation Fix**:
  - Target = Sum of individual amounts (NOT bulk × count)
  - Works correctly in Preview, PDF, and Excel exports
  - Uses month-wise API that returns all members with individual amounts

### January 7, 2026 (Session 2)
- [x] **Fund Reports Page Simplified Design** - Complete redesign as per Claude.ai format:
  - Duration dropdown (Current Month, Last Month, Last 3 Months, Current FY, Last FY, Custom)
  - Category dropdown (Kitty, Meeting Fee, Events) - Single select
  - Event dropdown (conditional - only when Events selected)
  - Download Excel (green) & Download PDF (red) buttons
  - Client-side PDF/Excel generation using jspdf, jspdf-autotable, xlsx-js-style, file-saver
  - Indian Financial Year logic (April-March)
  - Dynamic Chapter name from database in reports
- [x] **Proper Color Styling** in Excel & PDF reports:
  - Header: Dark Blue (#1E3A5F) with White text
  - Paid Status: Light Green bg (#D4EDDA) with Dark Green text (#155724)  
  - Pending Status: Light Red/Pink bg (#F8D7DA) with Dark Red text (#721C24)
  - Summary: Received in Green, Pending Amt in Red
  - Rs. symbol for currency with Indian number formatting
- [x] **Report Preview Feature** - Preview button shows modal before download:
  - Member table with Sr, ID, Name, Amount, Status columns
  - Colored status cells (Paid=green, Pending=red)
  - SUMMARY section with month-wise breakdown
  - Download Excel/PDF buttons in modal footer
- [x] **Login ID Label Change** - "Mobile Number" → "Login ID" everywhere:
  - Login screen: "Login ID" label, "Enter Login ID" placeholder
  - Super Admin Create Chapter: "Admin Login ID" label
  - Super Admin Chapter cards: "Admin Login ID: xxxxx"
  - Super Admin Update Credentials: "New Admin Login ID" label
- [x] New backend APIs: `/admin/profile`, `/admin/fund/kitty/payments/all`, `/admin/fund/meetingfee/payments/all`
- [x] Removed: Summary cards, Payment Status filter, Member-wise Reports section from UI

### January 7, 2026 (Session 1)
- [x] **Report Summary Section** - Complete implementation in backend Excel & PDF exports:
  - Member Status: Total members, Fully Paid, Pending counts
  - Category-wise Collection: Kitty, Meeting Fee, Events - Collected vs Pending amounts
  - Month-wise Breakdown: Per-month collected and pending amounts
- [x] Input validation for month parameter (1-12 range) in export functions
- [x] 27 automated tests created for fund report exports (100% pass rate)

### January 5, 2026
- [x] Fund Management restructuring completed
- [x] Meeting Fees page created (replaces Miscellaneous)
- [x] Category filter added to Fund Reports (Kitty/Meeting Fees/Events)
- [x] Category filter added to Excel/PDF export
- [x] Removed "All Pending", "All Paid", "Clear" buttons from Kitty, Meeting Fees, Events
- [x] Mobile pending list added to QR Display page
- [x] Mobile-first responsive design verified

### Previous Sessions
- [x] Complete mobile UI/UX overhaul
- [x] New logo and branding integration
- [x] Fund report month-wise and date-range filters
- [x] Full Kitty, Events, Misc CRUD operations
- [x] QR-based attendance system
- [x] Meeting management
- [x] Members management
- [x] Reports with Excel/PDF export

## Pending Issues

### P0 - Critical
1. **Proxy Attendance Security Flaw**: Any user can mark attendance for another member
   - Needs: Device fingerprinting or geo-fencing solution

### P1 - Important
1. **APK File Request**: User wants APK for Google Play Store
   - Need to call support_agent for guidance

### P2 - Low Priority
1. **Preview Environment**: API routing issues (Infrastructure)

## Future/Backlog Tasks

### P0 Tasks
- Implement proxy attendance prevention

### P1 Tasks
- Refactor server.py into smaller routers (currently 2000+ lines)
- Create reusable payment hook for frontend
- Answer APK file query via support_agent

### P2 Tasks
- Add more reporting features
- Member profile enhancements
- Notification system

## Technical Architecture

### Backend
- FastAPI with Python
- MongoDB database
- JWT authentication

### Frontend
- React.js
- TailwindCSS
- Shadcn/UI components
- PWA with manifest

### Key Files
- `/app/backend/server.py` - Main backend logic
- `/app/backend/models.py` - Pydantic models
- `/app/frontend/src/pages/` - All React pages

### Database Collections
- `admins`, `members`, `meetings`, `attendance`
- `kitty_settings`, `kitty_payments`
- `meetingfee_settings`, `meetingfee_payments`
- `fund_events`, `event_payments`

## Test Credentials
- **Super Admin**: Mobile: `919893452545`, Password: `superadmin123@`
- **Chapter Admin (BNI AMIGOS RAIPUR)**: Mobile: `7773010121`, Password: `admin@123`
