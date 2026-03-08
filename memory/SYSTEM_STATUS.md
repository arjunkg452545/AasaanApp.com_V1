# AasaanApp — System Status

> **Last Updated**: 2026-03-08 | **Build Status**: PASSING | **Tests**: 66/66

---

## 1. File Structure

### 1.1 Frontend Pages (`frontend/src/pages/` — 62 files)

| File | Purpose | Role |
|---|---|---|
| `Login.js` | Login page (member + admin + staff) | Public |
| `UnifiedHome.js` | Member/Admin dashboard | Member/Admin |
| `UnifiedMemberLayout.js` | Shared layout for /app/* routes | Member/Admin |
| `MemberAttendance.js` | Personal attendance history | Member |
| `MemberMyProfile.js` | Personal profile page | Member |
| `MemberPayments.js` | Payment overview | Member |
| `MemberPaymentDetail.js` | Single payment detail | Member |
| `MemberPaymentHistory.js` | Payment history list | Member |
| `MemberPendingApprovals.js` | Pending membership approvals | Member |
| `QRAttendanceScanner.js` | In-app QR scanner (jsQR) | Member |
| `Notifications.js` | Notification list | Member/Admin |
| `AttendanceForm.js` | Public attendance form (substitute/visitor) | Public |
| `MeetingManagementHub.js` | Meeting hub (cards → manage/qr/reports) | Admin |
| `MeetingManagement.js` | Meeting CRUD (create/edit/archive) | Admin |
| `QRManagement.js` | QR code generation list | Admin |
| `QRDisplay.js` | QR code display at venue | Admin |
| `LiveAttendance.js` | Real-time attendance during meeting | Admin |
| `MembersManagement.js` | Member list + management | Admin |
| `MemberProfile.js` | Individual member profile (admin view) | Admin |
| `ReportsManagement.js` | Report access hub | Admin |
| `SendNotification.js` | Send notification form | Admin |
| `ChapterFeeConfig.js` | Fee configuration | Admin |
| `AdminVerifyPayments.js` | Verify member payments | Admin |
| `AdminManualEntry.js` | Manual payment entry | Admin |
| `PaymentReminders.js` | Payment reminder management | Admin |
| `VisitorManagement.js` | Visitor tracking | Admin |
| `FundManagementHub.js` | Fund management dashboard | Admin |
| `KittyPayment.js` | Kitty fund payments | Admin |
| `MeetingFeePayment.js` | Meeting fee payments | Admin |
| `EventPayment.js` | Event payments | Admin |
| `MiscPayment.js` | Miscellaneous payments | Admin |
| `FundReports.js` | Fund report viewer | Admin |
| `FundReportPreview.js` | Report preview modal | Admin |
| `FundReportExportExcel.js` | Excel export logic | Admin |
| `FundReportExportPDF.js` | PDF export logic | Admin |
| `fundReportHelpers.js` | Shared report utilities | Admin |
| `SuperAdminLayout.js` | SuperAdmin layout wrapper | SuperAdmin |
| `SuperAdminDashboard.js` | SuperAdmin dashboard | SuperAdmin |
| `SuperAdminMembers.js` | Member management (cross-chapter) | SuperAdmin |
| `SuperAdminReports.js` | SuperAdmin reports | SuperAdmin |
| `SAChapterCards.js` | Chapter card components | SuperAdmin |
| `SAChapterDialogs.js` | Chapter dialog components | SuperAdmin |
| `SASubscriptionBanner.js` | Subscription status banner | SuperAdmin |
| `SubscriptionTable.js` | Subscription data table | SuperAdmin |
| `SubscriptionModals.js` | Subscription modals | SuperAdmin |
| `ManageAdmins.js` | Admin management | SuperAdmin |
| `PaymentConfig.js` | Payment configuration | SuperAdmin |
| `PaymentGatewaySetup.js` | Gateway setup | SuperAdmin |
| `AccountantManagement.js` | Accountant CRUD | SuperAdmin |
| `AuditLog.js` | Audit log viewer | SuperAdmin |
| `AccountantLayout.js` | Accountant layout wrapper | Accountant |
| `AccountantDashboard.js` | Accountant dashboard | Accountant |
| `AccountantApprovals.js` | Payment approvals | Accountant |
| `AccountantReports.js` | Accountant reports | Accountant |
| `DeveloperLayout.js` | Developer layout wrapper | Developer |
| `DeveloperDashboard.js` | Developer dashboard | Developer |
| `DeveloperEDs.js` | ED/SuperAdmin management | Developer |
| `DeveloperSubscriptions.js` | Subscription settings | Developer |
| `DeveloperSettings.js` | System settings | Developer |
| `DeveloperMessagingConfig.js` | Messaging provider config | Developer |
| `DeveloperOTPConfig.js` | OTP provider config | Developer |
| `CreateSuperAdmin.js` | Create new SuperAdmin | Developer |

### 1.2 Frontend Utilities (`frontend/src/utils/`)

| File | Purpose |
|---|---|
| `api.js` | Axios instance with JWT interceptor, 401 handler, cache-busting |
| `formatDate.js` | Date formatting helpers |

### 1.3 Frontend Components (`frontend/src/components/`)

| File | Purpose |
|---|---|
| `InstallPWA.js` | PWA install prompt component |
| `ThemeToggle.js` | Dark/light mode toggle |
| `ui/` | 43 shadcn/ui components (button, card, dialog, table, etc.) |

### 1.4 Backend Route Files (`backend/routes/` — 33 files)

| File | Endpoints | Purpose |
|---|---|---|
| `public.py` | 4 | QR verify, public attendance, member list, app version |
| `member_auth.py` | 3 | Member login, set password, change password |
| `admin_auth.py` | 2 | Admin/staff login, logout |
| `meetings.py` | ~15 | Meeting CRUD, QR, attendance list/summary, manual mark, Excel/PDF |
| `member_portal.py` | ~12 | In-app attendance, dashboard, profile, history |
| `notifications.py` | ~5 | Send, list, count, mark read |
| `superadmin.py` | ~10 | Chapter CRUD, dashboard, settings |
| `superadmin_members.py` | ~8 | Member approval/management |
| `superadmin_reports.py` | ~4 | Report data endpoints |
| `developer.py` | ~8 | ED management, platform settings |
| `chapter_admin.py` | ~6 | Chapter-level admin functions |
| `chapter_admin_enhanced.py` | ~4 | Enhanced admin features |
| `fund_kitty.py` | ~6 | Kitty settings + payments CRUD |
| `fund_meetingfee.py` | ~6 | Meeting fee settings + payments CRUD |
| `fund_events.py` | ~6 | Event fund CRUD |
| `fund_misc.py` | ~5 | Misc fund CRUD |
| `fund_reports.py` | ~4 | Fund report data |
| `fund_reports_excel.py` | ~3 | Excel generation |
| `fund_reports_pdf.py` | ~3 | PDF generation |
| `payment_config.py` | ~4 | Payment config CRUD |
| `payment_gateway.py` | ~4 | Gateway setup |
| `payment_reminders.py` | ~5 | Reminder management |
| `fee_ledger.py` | ~4 | Fee ledger operations |
| `visitors.py` | ~4 | Visitor CRUD |
| `admin_verification.py` | ~4 | Payment verification |
| `audit_log.py` | ~3 | Audit log access |
| `accountant_reports.py` | ~3 | Accountant reports |
| `ed_approval.py` | ~3 | ED approval workflows |
| `messaging_config.py` | ~3 | Messaging provider config |
| `otp.py` | ~3 | OTP send/verify |
| `seed_data.py` | ~2 | Data seeding |
| `subscription_settings.py` | ~4 | Subscription management |

**Total**: ~150+ endpoints across 33 route files

### 1.5 Backend Utility Files (`backend/` — 11 files)

| File | Purpose |
|---|---|
| `server.py` | FastAPI app entry point, CORS, router registration, startup events |
| `auth.py` | JWT creation/verification, password hashing (bcrypt), role-based expiry |
| `database.py` | MongoDB connection via motor async driver |
| `deps.py` | `get_current_user()`, `require_role()` dependency factories |
| `models.py` | Pydantic models (Meeting, Attendance, Member) |
| `models_payment.py` | Pydantic models (Login, Payment, Fund) |
| `qr_generator.py` | QR token generation/verification (JWT-based) |
| `report_generator.py` | Report generation utilities |
| `file_storage.py` | File/S3 storage abstraction |
| `gateway_base.py` | Payment gateway base class |
| `otp_service.py` | OTP sending service (Twilio/MSG91) |

---

## 2. What's Working (Verified 2026-03-08)

All items below passed E2E testing on production (`66/66 tests`):

### Build & Deploy
- [x] Frontend build: `npx craco build` — zero errors, zero warnings
- [x] Backend compile: all 45 Python files — zero syntax errors
- [x] Railway deployment: auto-deploy on push to main

### Authentication (5 login types)
- [x] Member login (mobile + password → JWT with role=member)
- [x] Admin login (chapter role holder → JWT with role=admin + chapter_role)
- [x] SuperAdmin login (admin-login endpoint → JWT with role=superadmin)
- [x] Accountant login (admin-login endpoint → JWT with role=accountant)
- [x] Developer login (admin-login endpoint → JWT with role=developer)
- [x] Logout (cookie cleared)
- [x] Token expiry: Members 90 days, Staff 7 days

### Attendance System
- [x] Meeting creation with all time fields
- [x] QR code generation (HTTP 200, valid payload)
- [x] QR verification endpoint (validates time window)
- [x] In-app member attendance (`POST /api/member/mark-attendance`)
- [x] Public substitute attendance
- [x] Public visitor attendance
- [x] Manual attendance (admin)
- [x] Duplicate prevention (member + substitute)
- [x] Public endpoint blocks `type=member`
- [x] Attendance summary (total, present, subs, visitors, pending)
- [x] Late/on-time classification via `late_cutoff_time`
- [x] Excel report export
- [x] PDF report export

### Member Management
- [x] List members (admin)
- [x] Member profile view
- [x] Member dashboard data
- [x] SuperAdmin member management

### Notifications
- [x] Send custom notification (admin)
- [x] Unread count endpoint
- [x] Notification list endpoint
- [x] Type-based permission enforcement

### SaaS Data Isolation
- [x] All queries filter by `chapter_id`
- [x] Cross-chapter data access prevented

### QR Scanner (jsQR)
- [x] Single getUserMedia call
- [x] Proper stream cleanup
- [x] Duplicate scan prevention
- [x] iOS Safari compatibility
- [x] Camera permission handling

### Mobile Responsiveness
- [x] All pages render at 375px width
- [x] Touch targets minimum 36px
- [x] No horizontal overflow
- [x] Currency grids truncate properly

### Route Navigation
- [x] All 80+ `navigate()` calls match App.js routes
- [x] Zero mismatches between frontend navigation and route definitions

---

## 3. Known Issues

### Currently None (P0/P1)
All critical and important bugs were fixed in the March 8 session.

### Potential Future Concerns
1. **Geo-fencing**: No location-based attendance validation (relies on QR + member auth)
2. **Offline Mode**: QR scanning requires network — no offline queue
3. **APK/IPA**: PWA only — no native app packaging yet
4. **Rate Limiting**: No API rate limiting on public endpoints

---

## 4. Pending / Future Features

### Near-Term
1. **APK for Play Store** — Client has requested Android APK
2. **Push Notifications** — Browser push via service worker
3. **Geo-fencing** — Location-based attendance verification
4. **Payment Gateway Integration** — Razorpay live mode
5. **WhatsApp Integration** — Direct messaging via WhatsApp Business API

### Long-Term
1. **Multi-language Support** — Hindi, regional languages
2. **Analytics Dashboard** — Attendance trends, payment analytics
3. **Member Directory** — Searchable member profiles across chapters
4. **Automated Reports** — Scheduled email/WhatsApp report delivery
5. **Native Mobile App** — React Native or Flutter wrapper

---

## 5. Recent Changes Log

### 2026-03-08 (Latest)
- **CRITICAL FIX**: `datetime.fromisoformat()` crash on HH:MM time strings
  - Added `_parse_meeting_dt()` helper to `meetings.py`, `public.py`, `member_portal.py`
  - Fixed: attendance summary ISE, public substitute/visitor ISE, in-app attendance ISE
- **Mobile Polish**: QR back button touch target (`min-h-[36px]`), FundManagementHub currency grid overflow
- **E2E Test**: 66/66 tests pass — product release ready

### 2026-03-07
- QR Scanner rewrite: html5-qrcode → jsQR
- Meeting Hub redesign
- Attendance View redesign + manual marking
- 3 critical bug fixes (attendance redirect, iOS camera, mobile mark button)
- Full system audit (8 areas)
- Auto-logout fix (nuclear conservative 401 handler)

### 2026-01-08
- Custom month range duration filter
- Payment mode column in meeting fee reports
- Individual member amount edit
- Target amount calculation fix

### 2026-01-07
- Fund reports redesign (client-side PDF/Excel)
- Color styling in Excel/PDF reports
- Report preview modal
- Login ID label change

### 2026-01-05
- Fund management restructuring (Kitty, Meeting Fees, Events)
- Category filter in fund reports
- Mobile pending list on QR display

---

## 6. Dependencies

### Frontend (58 packages)

**Core:**
- `react` ^19.0.0, `react-dom` ^19.0.0
- `react-router-dom` ^7.5.1
- `react-scripts` 5.0.1 (via craco)
- `axios` ^1.8.4

**UI Framework:**
- `tailwind-merge` ^3.2.0, `tailwindcss-animate` ^1.0.7
- `class-variance-authority` ^0.7.1, `clsx` ^2.1.1
- `lucide-react` ^0.507.0
- `next-themes` ^0.4.6
- `sonner` ^2.0.3 (toast notifications)
- 20+ `@radix-ui/*` primitives (dialog, dropdown, tabs, etc.)

**Functional:**
- `jsqr` ^1.4.0 (QR scanning)
- `xlsx` ^0.18.5, `xlsx-js-style` ^1.2.0 (Excel export)
- `jspdf` ^4.0.0, `jspdf-autotable` ^5.0.7 (PDF export)
- `date-fns` ^4.1.0 (date formatting)
- `zod` ^3.24.4 (validation)
- `react-hook-form` ^7.56.2, `@hookform/resolvers` ^5.0.1
- `@fingerprintjs/fingerprintjs` ^5.0.1 (device fingerprinting)
- `file-saver` ^2.0.5

**Dev Dependencies (12):**
- `@craco/craco`, `tailwindcss`, `postcss`, `autoprefixer`
- `@testing-library/*` (react, jest-dom, user-event)

### Backend (76 packages in requirements.txt)

**Core:**
- `fastapi` 0.110.1
- `motor` 3.3.1 (async MongoDB)
- `pymongo` 4.5.0
- `pydantic` 2.12.4
- `python-jose` / `PyJWT` 2.10.1 (JWT)
- `passlib` 1.7.4, `bcrypt` 4.0.1 (password hashing)
- `pytz` (timezone handling)

**Reports:**
- `openpyxl` 3.1.5 (Excel generation)
- `pandas` 2.3.3 (data manipulation)
- `pillow` 12.0.0 (image processing)
- `PyPDF2` 3.0.1

**Infrastructure:**
- `boto3` 1.41.3 (AWS S3)
- `cryptography` 46.0.3
- `aiofiles` 24.1.0
- `email-validator` 2.3.0

**Dev/Lint:**
- `black` 25.11.0, `flake8` 7.3.0, `isort` 7.0.0, `mypy` 1.18.2
