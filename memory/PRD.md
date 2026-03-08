# AasaanApp — Product Requirements Document (PRD)

> **Last Updated**: 2026-03-08 | **Version**: 2.0 | **Status**: Beta Release Ready

---

## 1. Application Overview

**AasaanApp** is a SaaS platform for managing BNI (Business Network International) chapters. It handles attendance tracking, member management, fund/payment management, and chapter administration through a Progressive Web App (PWA).

| Property | Value |
|---|---|
| **Frontend** | React 19 PWA (CRA + craco) |
| **Backend** | FastAPI (Python 3.11+) on Railway |
| **Database** | MongoDB Atlas (motor async driver) |
| **Design System** | Neumorphic (CSS custom properties) |
| **QR Scanner** | jsQR (replaced html5-qrcode) |
| **Production URL** | `https://aasaanappcomv1-production.up.railway.app` |
| **Frontend Build** | `npx craco build` (NOT react-scripts) |
| **Path Alias** | `@/` via jsconfig.json + craco.config.js |

---

## 2. SaaS Architecture (Multi-Tenancy)

```
Developer (Platform Owner)
  └── Executive Directors (EDs) / SuperAdmins
        └── Chapters (each a tenant)
              └── Chapter Admins (President, VP, Secretary, Treasurer, LVH)
                    └── Members
```

**Data Isolation**: Every query filters by `chapter_id`. Members never see other chapters' data. SuperAdmins see only their assigned chapters.

---

## 3. User Roles & Login

### 3.1 Login Types

| Role | Login Endpoint | Credentials | Token Expiry |
|---|---|---|---|
| **Member** | `POST /api/member/login` | mobile + password | 90 days |
| **Chapter Admin** | `POST /api/member/login` | mobile + password (role holders auto-elevated) | 90 days |
| **SuperAdmin** | `POST /api/auth/admin-login` | mobile + password | 7 days |
| **Accountant** | `POST /api/auth/admin-login` | mobile + password | 7 days |
| **Developer** | `POST /api/auth/admin-login` | email + password | 7 days |

### 3.2 Role Determination (Member Login)

The JWT `role` field is determined by `chapter_role` in the members collection:

| chapter_role | JWT role | Access Level |
|---|---|---|
| `president` | `admin` | Full chapter management |
| `vice_president` | `admin` | Full chapter management |
| `secretary` | `admin` | Chapter management (limited) |
| `treasurer` | `admin` | Chapter management (limited) |
| `secretary_treasurer` | `admin` | Chapter management (limited) |
| `lvh` | `admin` | Chapter management (limited) |
| `member` | `member` | Personal dashboard only |

### 3.3 Test Credentials

| Role | Login ID | Password |
|---|---|---|
| President (Admin) | `9999900003` | `Test@1234` |
| Member | `9999900006` | `Test@1234` |
| SuperAdmin | `9999900001` | `Test@1234` |
| Accountant | `9999900008` | `Test@1234` |
| Developer | `admin@aasaanapp.com` | `AasaanAdmin2026!` |

**Test Chapter**: `CH20260226014957` — "BNI Sunrise Test Chapter"

---

## 4. Role Permissions

### 4.1 Chapter Admin (President / VP) — Full Access
- Create/manage meetings (CRUD + archive)
- Generate/display QR codes for attendance
- View live attendance + summary
- Mark manual attendance
- Export attendance reports (Excel/PDF)
- Manage members (add, edit, approve, suspend)
- Send notifications (`payment_reminder`, `meeting_schedule`, `custom`)
- Configure chapter fees
- Verify member payments
- Fund management (kitty, meeting fees, events, misc)
- View fund reports
- Visitor management

### 4.2 Chapter Admin (Secretary / Treasurer / LVH)
- Same functional areas but with limited administrative scope
- Access: meetings, fundHub, reports, visitors, reminders

### 4.3 Member
- View personal dashboard (UnifiedHome)
- Scan QR code for attendance (in-app scanner)
- View own attendance history
- View/make payments
- View notifications
- Update own profile
- Change password

### 4.4 SuperAdmin (Executive Director)
- Manage assigned chapters
- Manage chapter members (approve/reject/suspend)
- View chapter reports
- Manage accountants
- Payment gateway configuration
- Subscription management
- Audit log access

### 4.5 Developer (Platform Owner)
- Full platform control
- Create/manage EDs (SuperAdmins)
- Subscription settings
- Messaging configuration (Twilio/MSG91)
- OTP configuration
- System settings

---

## 5. Features Implemented

### 5.1 Attendance System

**Three attendance paths:**

| Path | Who | Endpoint | Auth |
|---|---|---|---|
| **In-App Scanner** | Members | `POST /api/member/mark-attendance` | JWT (member/admin) |
| **Public Form** | Substitutes, Visitors | `POST /api/attendance/mark` | None (QR token validates) |
| **Manual Entry** | Admin | `POST /api/admin/meetings/{id}/mark-manual` | JWT (admin) |

**QR Attendance Flow:**
1. Admin creates meeting with date, start_time, late_cutoff_time, end_time
2. Admin generates QR code → JWT token with meeting_id + attendance_type
3. Admin displays QR at venue (QRDisplay page with auto-refresh)
4. Members open app → Scan QR → `POST /api/member/mark-attendance` → attendance auto-marked
5. Substitutes/Visitors scan QR → opens public form → `POST /api/attendance/mark`
6. Public endpoint **blocks** `type=member` — forces members to use in-app scanner (proxy prevention)

**Time handling:**
- Meeting times stored as `HH:MM` strings (e.g., `"16:00"`, `"19:00"`)
- Meeting dates stored as `YYYY-MM-DD` strings
- `_parse_meeting_dt(date_str, time_str)` helper combines into IST-aware datetime
- Late/on-time determined by `late_cutoff_time` comparison
- All time operations use `Asia/Kolkata` timezone (IST)

**Duplicate prevention:**
- Members: checked by `unique_member_id` OR `primary_mobile`
- Substitutes: checked by `unique_member_id` + `primary_mobile`

### 5.2 Meeting Management
- Create meetings with date, start/end time, late cutoff
- Archive old meetings
- QR code generation (JWT-based tokens)
- Live attendance view during meetings
- Attendance summary (total, present, substitutes, visitors, pending)
- Excel and PDF export of attendance reports

### 5.3 Member Management
- Add/edit members with full profile
- Approve/reject/suspend membership
- Set/reset member passwords (admin function)
- Member self-service: change password, view profile
- Alphabetical member listing (A-Z, case-insensitive)

### 5.4 Fund Management
- **Kitty Fund**: Chapter savings/investment tracking
- **Meeting Fees**: Per-meeting fee collection with individual amount editing
- **Event Payments**: Special event fee management
- **Misc Payments**: Miscellaneous transactions
- **Fund Reports**: Category-filtered reporting with Excel/PDF export, report preview

### 5.5 Notifications
- Type-based send permissions: President → `payment_reminder`, `meeting_schedule`, `custom`
- Recipients: all members, pending members, role holders, or specific member IDs
- Unread count badge on navigation
- Read/unread tracking per member

### 5.6 Payment System
- Chapter fee configuration per category
- Automated payment reminders
- Admin payment verification workflow
- Manual payment entry
- Payment gateway setup (Razorpay, per SuperAdmin)
- Member payment history with detail view

### 5.7 Visitor Management
- Track visitors attending meetings via attendance form
- Invited-by member linking (filtered by chapter_id)
- Visitor details: name, mobile, email, company, business category

### 5.8 Accountant Portal
- Dedicated login, layout, and dashboard
- Payment approvals workflow
- Financial reports access

### 5.9 Developer Portal
- ED/SuperAdmin creation and management
- Subscription settings (per-chapter)
- Messaging config (Twilio/MSG91)
- OTP config
- System settings

### 5.10 PWA Features
- Installable (Add to Home Screen)
- Force update via `/api/app/version` + semver comparison
- Optional update banner (dismissible)
- Error boundary with reload
- Loading spinner (neumorphic)

---

## 6. Route Structure

### 6.1 Frontend Routes

**Public:**
- `/login` — Login page
- `/attendance/:token` — Public attendance form (QR scanned)

**Member/Admin (UnifiedMemberLayout → `/app/*`):**
- `/app/home` — Dashboard (UnifiedHome)
- `/app/attendance` — Attendance history
- `/app/payments` — Payments overview
- `/app/payments/:id` — Payment detail
- `/app/payment-history` — Payment history
- `/app/profile` — Member profile
- `/app/scanner` — QR attendance scanner (jsQR)
- `/app/notifications` — Notifications list
- `/app/pending-approvals` — Pending membership approvals
- `/app/members` — Members management (admin)
- `/app/members/:id` — Member profile (admin)
- `/app/meetings` — Meeting management hub (admin)
- `/app/meetings/manage` — Meeting CRUD (admin)
- `/app/meetings/qr` — QR management (admin)
- `/app/meetings/qr/:meetingId` — QR display (admin)
- `/app/meetings/live/:meetingId` — Live attendance (admin)
- `/app/reports` — Reports management (admin)
- `/app/fee-config` — Chapter fee config (admin)
- `/app/verify-payments` — Verify payments (admin)
- `/app/manual-entry` — Manual payment entry (admin)
- `/app/payment-reminders` — Payment reminders (admin)
- `/app/funds` — Fund management hub (admin)
- `/app/funds/kitty` — Kitty payments (admin)
- `/app/funds/meeting-fee` — Meeting fee payments (admin)
- `/app/funds/misc` — Misc payments (admin)
- `/app/funds/events` — Event payments (admin)
- `/app/fund-reports` — Fund reports (admin)
- `/app/visitors` — Visitor management (admin)
- `/app/send-notification` — Send notification (admin)

**SuperAdmin (`/superadmin/*`):**
- `/superadmin/dashboard`, `/superadmin/members`, `/superadmin/manage-admins`
- `/superadmin/reports`, `/superadmin/payment-config`, `/superadmin/payment-gateway`
- `/superadmin/accountants`, `/superadmin/audit-log`

**Accountant (`/accountant/*`):**
- `/accountant/dashboard`, `/accountant/approvals`, `/accountant/reports`

**Developer (`/developer/*`):**
- `/developer/dashboard`, `/developer/eds`, `/developer/subscriptions`
- `/developer/settings`, `/developer/create-superadmin`
- `/developer/messaging-config`, `/developer/otp-config`

### 6.2 Backend API Endpoints

All routes prefixed with `/api`. Key modules:

| Route File | Prefix | Purpose |
|---|---|---|
| `public.py` | `/api` | QR verify, public attendance, members list, app version |
| `member_auth.py` | `/api` | Member login, set/change password |
| `admin_auth.py` | `/api` | Staff login (superadmin/accountant), logout |
| `meetings.py` | `/api/admin` | Meeting CRUD, QR, attendance, summary, reports |
| `member_portal.py` | `/api/member` | In-app attendance, dashboard, profile, attendance history |
| `notifications.py` | `/api` | Send/list/count notifications |
| `superadmin.py` | `/api/superadmin` | Chapter CRUD, admin management |
| `superadmin_members.py` | `/api/superadmin` | Member management across chapters |
| `superadmin_reports.py` | `/api/superadmin` | SuperAdmin report access |
| `developer.py` | `/api/developer` | Platform settings, ED management |
| `chapter_admin.py` | `/api/admin` | Chapter admin functions |
| `chapter_admin_enhanced.py` | `/api/admin` | Enhanced chapter admin features |
| `fund_kitty.py` | `/api/admin` | Kitty fund CRUD |
| `fund_meetingfee.py` | `/api/admin` | Meeting fee CRUD |
| `fund_events.py` | `/api/admin` | Event fund CRUD |
| `fund_misc.py` | `/api/admin` | Misc fund CRUD |
| `fund_reports.py` | `/api/admin` | Fund report data |
| `fund_reports_excel.py` | `/api/admin` | Excel export |
| `fund_reports_pdf.py` | `/api/admin` | PDF export |
| `payment_config.py` | `/api/superadmin` | Payment configuration |
| `payment_gateway.py` | `/api/superadmin` | Gateway setup |
| `payment_reminders.py` | `/api/admin` | Payment reminder management |
| `fee_ledger.py` | `/api` | Fee ledger operations |
| `visitors.py` | `/api/admin` | Visitor management |
| `admin_verification.py` | `/api/admin` | Payment verification |
| `audit_log.py` | `/api` | Audit trail |
| `accountant_reports.py` | `/api/accountant` | Accountant report access |
| `ed_approval.py` | `/api` | ED approval workflows |
| `messaging_config.py` | `/api/developer` | Messaging provider config |
| `otp.py` | `/api` | OTP send/verify |
| `seed_data.py` | `/api` | Data seeding utilities |
| `subscription_settings.py` | `/api` | Subscription management |

---

## 7. Environment Variables

### Backend (Railway)
```
JWT_SECRET              — JWT signing key (REQUIRED)
MONGODB_URI / MONGO_URL — MongoDB Atlas connection string
QR_SECRET_KEY           — QR token signing key
TWILIO_ACCOUNT_SID      — Twilio SMS (optional)
TWILIO_AUTH_TOKEN        — Twilio auth (optional)
MSG91_AUTH_KEY           — MSG91 OTP (optional)
AWS_ACCESS_KEY_ID        — S3 storage (optional)
AWS_SECRET_ACCESS_KEY    — S3 storage (optional)
```

### Frontend (.env)
```
REACT_APP_API_URL       — Backend API base URL (primary)
REACT_APP_BACKEND_URL   — Backend URL (fallback)
```

---

## 8. Technical Details

### 8.1 Authentication Architecture
- JWT tokens with role-based claims (role, member_id, chapter_id, chapter_role)
- httpOnly cookie + response body dual delivery
- Frontend stores in localStorage for axios interceptor
- `deps.py`: `get_current_user()` extracts JWT, `require_role()` enforces RBAC
- Nuclear conservative 401 handler: checks `token_expires_at` before logout (prevents false logouts on transient errors)

### 8.2 QR Code System
- `qr_generator.py`: JWT-based tokens containing meeting_id + attendance_type
- Token verified via `verify_qr_token()` → returns payload with meeting_id
- QR display page auto-refreshes with configurable type (member/substitute/visitor)
- jsQR library for in-app scanning (single getUserMedia, proper cleanup, iOS compatible)

### 8.3 Design System (Neumorphic)
- CSS custom properties: `--nm-bg`, `--nm-text-primary`, `--nm-text-secondary`, `--nm-text-muted`, `--nm-accent`
- Utility classes: `nm-raised`, `nm-flat`, `nm-inset`, `nm-btn-primary`, `nm-tab`, `nm-input`, `nm-interactive`
- Dark mode via `next-themes` ThemeProvider + `:root`/`.dark` selectors
- Brand color: `#CF2030` (BNI red) as `--nm-accent`
- UI primitives: shadcn/ui (Radix + Tailwind)

### 8.4 Database Collections
- **Auth**: `superadmins`, `member_credentials`, `accountant_credentials`
- **Core**: `chapters`, `members`, `meetings`, `attendance`
- **Funds**: `kitty_settings`, `kitty_payments`, `meetingfee_settings`, `meetingfee_payments`, `fund_events`, `event_payments`
- **Payments**: `fee_ledger`, `chapter_fee_config`, `payment_config`
- **System**: `visitors`, `audit_logs`, `subscription_settings`, `notifications`, `app_config`

---

## 9. Known Constraints

1. **Single Chapter per Member**: A member belongs to exactly one chapter
2. **IST Timezone**: All meeting times in Asia/Kolkata
3. **HH:MM Time Format**: Meeting times stored as simple strings, combined with date for datetime operations
4. **No Offline Attendance**: QR scanning requires network connectivity
5. **PWA Only**: No native app (APK/IPA) — installable via browser
