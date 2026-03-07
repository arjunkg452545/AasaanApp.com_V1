# AasaanApp — Product Requirements Document

## Original Problem Statement
Build a Progressive Web App (PWA) for a QR-code-based attendance system for BNI chapters with:
- Super Admin and Chapter Admin roles
- QR-based attendance marking
- Excel/PDF reporting
- Fund Management module

## Current Architecture (Phase 6)

### 5-Role RBAC System
1. **Developer**: Platform-level admin. Manages Executive Directors, subscriptions, global settings, audit logs.
2. **SuperAdmin (Executive Director)**: Manages chapters, creates chapter admins, payment config, accountants, gateway setup, reports, audit logs.
3. **Admin (Chapter Admin)**: Manages chapter members, meetings, attendance, funds. Now merged into member layout via chapter_role.
4. **Accountant**: Verifies/approves payments, views reports.
5. **Member**: Marks attendance, pays dues, views personal dashboard.

### 7 Chapter Roles (within members)
Members can hold chapter leadership roles that grant admin-like permissions:
- `president` — full access (members, meetings, fundHub, reports, visitors, reminders, settings)
- `vice_president` — full access
- `secretary` — meetings, fundHub, reports, visitors, reminders
- `treasurer` — fundHub, reports, reminders
- `secretary_treasurer` — meetings, fundHub, reports, visitors, reminders
- `lvh` — meetings, fundHub, reports, visitors, reminders
- `member` — personal dashboard only

### Unified Dashboard (`/app/*`)
All members and role-holders share a single layout (`UnifiedMemberLayout`). The bottom nav shows an "Admin" button for role-holders that opens a bottom sheet with admin functions. Sidebar shows both personal and chapter admin sections based on permissions.

### Frontend Architecture
- **React.js** with craco build (not raw react-scripts), `@` alias to `src/`
- **TailwindCSS** + **Shadcn/UI** components
- **Neumorphic design system** — CSS custom properties (`--nm-bg`, `--nm-surface`, `--nm-text-primary`, `--nm-accent`, etc.) with nm-* utility classes (`nm-raised`, `nm-btn-primary`, `nm-tab`, `nm-input`, `nm-interactive`)
- **Light/dark theme** via `:root` / `.dark` CSS variable selectors
- **Brand color**: `#CF2030` (BNI red) as `--nm-accent`
- **PWA** with service worker, manifest, offline support
- Lazy-loaded routes via `React.lazy()` + `Suspense`

### Backend Architecture (Modular)
- **FastAPI** with Python, modular route files
- **MongoDB** via motor async driver
- **JWT** cookie + Bearer token authentication
- **30+ route modules** in `routes/` (superadmin, chapter_admin, meetings, fund_kitty, fund_meetingfee, fund_misc, fund_events, fund_reports, member_auth, member_portal, payment_gateway, visitors, audit_log, etc.)
- `deps.py` — `require_role()` dependency factory, `get_current_user()` extraction
- `database.py` — motor client with `MONGO_URL` and `DB_NAME` env vars
- Startup events: seed superadmin, subscription settings, field migrations, index creation

### Key Route Modules
| Module | Prefix | Purpose |
|--------|--------|---------|
| `superadmin.py` | `/api/superadmin` | Chapter CRUD, admin management |
| `superadmin_members.py` | `/api/superadmin` | Member approval/rejection |
| `chapter_admin.py` | `/api/admin` | Chapter-level management |
| `meetings.py` | `/api/admin` | Meeting CRUD, QR, attendance |
| `fund_kitty.py` | `/api/admin/fund/kitty` | Kitty payments |
| `fund_meetingfee.py` | `/api/admin/fund/meetingfee` | Meeting fee payments |
| `fund_events.py` | `/api/admin/fund/events` | Event-based collections |
| `fund_reports.py` | `/api/admin/fund/reports` | Fund report data |
| `fund_reports_excel.py` | `/api/admin/fund/reports` | Excel export |
| `fund_reports_pdf.py` | `/api/admin/fund/reports` | PDF export |
| `member_auth.py` | `/api/member` | Member login/auth |
| `member_portal.py` | `/api/member` | Member personal data |
| `payment_gateway.py` | `/api` | Razorpay integration |
| `visitors.py` | `/api/admin` | Visitor management |
| `audit_log.py` | `/api` | Developer + SuperAdmin audit logs |
| `admin_verification.py` | `/api/admin` | Payment verification |
| `payment_reminders.py` | `/api/admin` | WhatsApp/SMS reminders |
| `admin_auth.py` | `/api` | Admin login |
| `accountant_reports.py` | `/api/accountant` | Accountant report access |
| `superadmin_reports.py` | `/api/superadmin` | SuperAdmin report access |

### Database Collections
- `superadmins`, `admins`, `members`, `member_credentials`
- `chapters`, `meetings`, `attendance`
- `kitty_settings`, `kitty_payments`
- `meetingfee_settings`, `meetingfee_payments`
- `fund_events`, `event_payments`
- `fee_ledger`, `chapter_fee_config`, `payment_config`
- `accountant_credentials`, `visitors`
- `audit_logs`, `subscription_settings`

### Frontend Route Structure
```
/                           → Login
/developer/*                → Developer portal
/superadmin/*               → SuperAdmin portal (incl. audit-log)
/app/*                      → Unified member + role-holder portal
  /app/home                 → Personal dashboard
  /app/my-payments          → Payment history
  /app/my-attendance        → Attendance history
  /app/my-profile           → Profile
  /app/members              → [role] Member management
  /app/meetings             → [role] Meeting hub
  /app/fund-hub             → [role] Fund management
  /app/reports              → [role] Reports
  /app/visitors             → [role] Visitor management
  /app/reminders            → [role] Payment reminders
  /app/settings             → [role] Chapter fee config
/accountant/*               → Accountant portal
/attendance                 → Public QR attendance form
```

## Session History

### March 2026 (P1–P3)
- [x] **P1**: Deleted dead files, fixed error handling in UnifiedHome.js, fixed dark mode hardcoded colors
- [x] **P2**: Neumorphic consistency across 7 /app/* pages, bottom sheet animation + swipe-to-close + drag handle, safe-area-bottom CSS
- [x] **P3**: Updated PRD.md, tightened CORS (env-var based), added SuperAdmin audit-log route (backend + frontend)

### January 8, 2026 (Session 3)
- [x] Custom Month Range duration filter (month+year dropdowns)
- [x] Payment Mode Column in Meeting Fee Reports only
- [x] Individual Member Amount Edit feature
- [x] Target Amount Calculation Fix (sum of individual amounts)

### January 7, 2026 (Session 2)
- [x] Fund Reports redesign (client-side PDF/Excel generation)
- [x] Color styling in Excel & PDF reports
- [x] Report Preview feature (modal before download)
- [x] Login ID Label Change ("Mobile Number" → "Login ID")

### January 7, 2026 (Session 1)
- [x] Report Summary Section (backend Excel & PDF exports)
- [x] Input validation for month parameter
- [x] 27 automated tests for fund report exports

### January 5, 2026
- [x] Fund Management restructuring (Kitty, Meeting Fees, Events)
- [x] Category filter in Fund Reports and exports
- [x] Mobile pending list on QR Display page

### Previous Sessions
- [x] Complete mobile UI/UX overhaul
- [x] New logo and branding integration
- [x] QR-based attendance system
- [x] Meeting, Members, Reports management
- [x] Full Kitty, Events, Misc CRUD operations

## Pending Issues

### P0 - Critical
1. **Proxy Attendance Security**: Any user can mark attendance for another member — needs device fingerprinting or geo-fencing

### P1 - Important
1. **APK File Request**: User wants APK for Google Play Store

### P2 - Low Priority
1. **Preview Environment**: API routing issues (Infrastructure)

## Test Credentials
- **Super Admin**: Mobile: `919893452545`, Password: `superadmin123@`
- **Chapter Admin (BNI AMIGOS RAIPUR)**: Mobile: `7773010121`, Password: `admin@123`
