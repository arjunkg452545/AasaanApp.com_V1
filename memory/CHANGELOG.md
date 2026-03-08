# AasaanApp — Changelog

All notable changes to this project are documented here.

---

## [2026-03-08] — E2E Testing, Critical Bug Fix, Beta Release

### Critical Fix
- **`datetime.fromisoformat()` crash on HH:MM strings**: Meeting times stored as "16:00" format caused `ValueError` when parsed with `fromisoformat()`. Added `_parse_meeting_dt(date_str, time_str)` helper to 3 files:
  - `backend/routes/meetings.py` — Summary endpoint was returning 500 ISE
  - `backend/routes/public.py` — Substitute/visitor attendance was crashing
  - `backend/routes/member_portal.py` — In-app member attendance was crashing

### Mobile Polish
- `QRDisplay.js`: Back button touch target `h-auto` → `min-h-[36px]`
- `FundManagementHub.js`: Currency grid overflow fix — `text-lg` → `text-sm md:text-2xl`, added `truncate`, `min-w-0` on cells, `min-h-[36px]` on Quick View buttons

### Testing
- Completed 12-phase E2E test suite: **66/66 tests pass**
- Phases: Build, Auth (5 types), Attendance (full flow), Roles, Notifications, Members, Route Audit (80+ navigate calls), Mobile (375px), SaaS Isolation, QR Scanner (13 checks)
- **Result**: PRODUCT RELEASE READY

### Commit
- `09c2c2a` — "Fix critical datetime parsing bug + mobile polish"

---

## [2026-03-07] — QR Scanner Rewrite, Meeting Hub Redesign, System Audit

### QR Scanner
- **Complete rewrite**: Replaced `html5-qrcode` with `jsQR` library
- Single `getUserMedia` call (fixes iOS camera issues)
- Proper stream cleanup on unmount
- Duplicate scan prevention with cooldown
- iOS Safari compatibility verified

### Meeting Hub Redesign
- New `MeetingManagementHub.js` — card-based navigation to Manage/QR/Reports
- Separated meeting CRUD, QR management, and reporting into distinct pages

### Attendance View Redesign
- New live attendance view during meetings
- Manual attendance marking by admin
- Attendance summary with breakdown (total, present, subs, visitors, pending)

### Bug Fixes (3 Critical)
1. **Attendance redirect**: Fixed redirect after QR scan success
2. **iOS camera**: Fixed camera not releasing on page navigation
3. **Mobile mark button**: Fixed touch target size on attendance mark button

### System Audit
- Full audit of 8 areas: Auth, Meetings, Attendance, Members, Funds, Notifications, Reports, QR
- Auto-logout fix: Nuclear conservative 401 handler — checks `token_expires_at` in localStorage before triggering logout (prevents false logouts on transient network errors)
- Camera cleanup audit across all scanner pages

---

## [2026-01-08] — Fund Reports Enhancements

### Features
- Custom month range duration filter (month + year dropdowns)
- Payment mode column in meeting fee reports only
- Individual member amount edit feature
- Target amount calculation fix (sum of individual amounts)

---

## [2026-01-07] — Fund Reports Redesign (Sessions 1 & 2)

### Session 2
- Fund reports redesign: client-side PDF/Excel generation
- Color styling in Excel and PDF reports
- Report preview feature (modal before download)
- Login ID label change ("Mobile Number" → "Login ID")

### Session 1
- Report summary section (backend Excel & PDF exports)
- Input validation for month parameter
- 27 automated tests for fund report exports

---

## [2026-01-05] — Fund Management Restructuring

### Features
- Fund management restructuring: Kitty, Meeting Fees, Events, Misc
- Category filter in fund reports and exports
- Mobile pending list on QR display page

---

## [2026-03 Earlier Sessions] — UI/UX Overhaul & Core Features

### Neumorphic Design System (P1–P3)
- **P1**: Deleted dead files, fixed error handling in UnifiedHome.js, fixed dark mode hardcoded colors
- **P2**: Neumorphic consistency across 7 /app/* pages, bottom sheet animation + swipe-to-close + drag handle, safe-area-bottom CSS
- **P3**: Updated PRD.md, tightened CORS (env-var based), added SuperAdmin audit-log route

### Previous Builds
- Complete mobile UI/UX overhaul
- New logo and branding integration
- QR-based attendance system (initial implementation)
- Meeting, Members, Reports management
- Full Kitty, Events, Misc CRUD operations
- 5-role RBAC system implementation
- SaaS multi-tenancy architecture
- PWA setup with service worker and manifest
