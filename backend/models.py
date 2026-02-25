from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class LoginRequest(BaseModel):
    mobile: str
    password: str

class LoginResponse(BaseModel):
    token: str
    role: str
    mobile: str
    chapter_id: Optional[str] = None
    chapter_name: Optional[str] = None

class ChapterCreate(BaseModel):
    name: str
    admin_mobile: str
    admin_password: str

class ChapterResponse(BaseModel):
    chapter_id: str
    name: str
    created_by: str
    admin_mobile: str
    audit_logs: List[dict] = []
    created_at: str

class UpdateCredentials(BaseModel):
    new_mobile: str
    new_password: str

class MemberCreate(BaseModel):
    unique_member_id: str
    full_name: str
    primary_mobile: str
    secondary_mobile: Optional[str] = None
    status: str = "Active"

class MemberUpdate(BaseModel):
    unique_member_id: Optional[str] = None
    full_name: Optional[str] = None
    primary_mobile: Optional[str] = None
    secondary_mobile: Optional[str] = None
    status: Optional[str] = None

class MemberResponse(BaseModel):
    member_id: str
    chapter_id: str
    unique_member_id: str
    full_name: str
    primary_mobile: str
    secondary_mobile: Optional[str] = None
    status: str
    created_at: str
    bni_member_id: Optional[str] = None
    organization_id: Optional[str] = None

class MeetingCreate(BaseModel):
    date: str
    start_time: str
    late_cutoff_time: str
    end_time: str

class MeetingResponse(BaseModel):
    meeting_id: str
    chapter_id: str
    date: str
    start_time: str
    late_cutoff_time: str
    end_time: str
    qr_token: str  # For backward compatibility
    qr_token_member: Optional[str] = None
    qr_token_substitute: Optional[str] = None
    qr_token_visitor: Optional[str] = None
    qr_expires_at: str
    created_at: str

class AttendanceCreate(BaseModel):
    meeting_id: str
    type: str  # member, substitute, visitor
    unique_member_id: Optional[str] = None
    primary_mobile: Optional[str] = None
    substitute_name: Optional[str] = None
    substitute_mobile: Optional[str] = None
    visitor_name: Optional[str] = None
    visitor_mobile: Optional[str] = None
    visitor_company: Optional[str] = None
    invited_by_member_id: Optional[str] = None
    device_fingerprint: Optional[str] = None
    ip_address: Optional[str] = None

class AttendanceResponse(BaseModel):
    attendance_id: str
    meeting_id: str
    unique_member_id: Optional[str] = None
    type: str
    status: str
    timestamp: str
    late_type: Optional[str] = None
    member_name: Optional[str] = None
    primary_mobile: Optional[str] = None
    substitute_name: Optional[str] = None
    substitute_mobile: Optional[str] = None
    visitor_name: Optional[str] = None
    visitor_mobile: Optional[str] = None
    visitor_company: Optional[str] = None
    invited_by_member_id: Optional[str] = None
    invited_by_member_name: Optional[str] = None
    device_fingerprint: Optional[str] = None
    ip_address: Optional[str] = None
    approval_status: str = "approved"  # approved, pending, rejected

# ===== FUND MANAGEMENT MODELS =====

class KittySettingCreate(BaseModel):
    month: int  # 1-12
    year: int
    amount: float

class KittySettingResponse(BaseModel):
    setting_id: str
    chapter_id: str
    month: int
    year: int
    amount: float
    created_at: str

class KittyPaymentCreate(BaseModel):
    member_id: str
    month: int
    year: int

class KittyPaymentResponse(BaseModel):
    payment_id: str
    chapter_id: str
    member_id: str
    member_name: str
    month: int
    year: int
    amount: float
    status: str  # paid, pending
    paid_date: Optional[str] = None
    received_by: Optional[str] = None

# Meeting Fees Models (similar to Kitty)
class MeetingFeeSettingCreate(BaseModel):
    month: int
    year: int
    amount: float

class MeetingFeeMarkPayment(BaseModel):
    member_id: str
    month: int
    year: int
    amount: Optional[float] = None  # Optional custom amount

class MeetingFeeBulkMark(BaseModel):
    member_ids: List[str]
    month: int
    year: int

class MiscPaymentCreate(BaseModel):
    payment_name: str
    amount: float
    due_date: str
    description: Optional[str] = None

class MiscPaymentResponse(BaseModel):
    misc_payment_id: str
    chapter_id: str
    payment_name: str
    amount: float
    due_date: str
    description: Optional[str] = None
    created_at: str
    total_collected: float = 0
    total_pending: float = 0

class MiscPaymentRecordCreate(BaseModel):
    misc_payment_id: str
    member_id: str
    payment_mode: str  # cash, upi, cheque
    transaction_id: Optional[str] = None  # For UPI
    cheque_no: Optional[str] = None  # For Cheque
    bank_name: Optional[str] = None  # For Cheque

class MiscPaymentRecordResponse(BaseModel):
    record_id: str
    misc_payment_id: str
    member_id: str
    member_name: str
    payment_mode: str
    status: str
    paid_date: Optional[str] = None
    transaction_id: Optional[str] = None
    cheque_no: Optional[str] = None
    bank_name: Optional[str] = None

class EventCreate(BaseModel):
    event_name: str
    amount: float
    event_date: str
    event_type: str  # compulsory, optional
    selected_members: Optional[List[str]] = None  # For optional events
    description: Optional[str] = None

class EventResponse(BaseModel):
    event_id: str
    chapter_id: str
    event_name: str
    amount: float
    event_date: str
    event_type: str
    description: Optional[str] = None
    created_at: str
    total_members: int = 0
    paid_count: int = 0
    pending_count: int = 0

class EventPaymentCreate(BaseModel):
    event_id: str
    member_id: str
    payment_mode: str  # cash, upi, cheque
    transaction_id: Optional[str] = None
    cheque_no: Optional[str] = None
    bank_name: Optional[str] = None

class EventPaymentResponse(BaseModel):
    payment_id: str
    event_id: str
    member_id: str
    member_name: str
    payment_mode: str
    status: str
    paid_date: Optional[str] = None
    transaction_id: Optional[str] = None
    cheque_no: Optional[str] = None
    bank_name: Optional[str] = None

# Bulk Operation Models
class BulkMarkPayment(BaseModel):
    member_ids: List[str]
    month: Optional[int] = None  # For Kitty
    year: Optional[int] = None   # For Kitty
    payment_id: Optional[str] = None  # For Misc
    event_id: Optional[str] = None    # For Event
    payment_mode: str = "cash"

class BulkUnmarkPayment(BaseModel):
    member_ids: List[str]
    month: Optional[int] = None
    year: Optional[int] = None
    payment_id: Optional[str] = None
    event_id: Optional[str] = None

# ===== DEVELOPER ROLE MODELS =====

class DeveloperLoginRequest(BaseModel):
    email: str
    password: str

class DeveloperLoginResponse(BaseModel):
    token: str
    role: str
    email: str
    name: str

class SuperAdminCreate(BaseModel):
    name: str
    email: str
    mobile: str
    password: str
    region: Optional[str] = None
    state: Optional[str] = None

class SuperAdminUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    region: Optional[str] = None
    state: Optional[str] = None
    is_active: Optional[bool] = None

class SuperAdminResponse(BaseModel):
    superadmin_id: str
    name: str
    email: Optional[str] = None
    mobile: str
    region: Optional[str] = None
    state: Optional[str] = None
    is_active: bool = True
    created_at: str
    chapter_count: int = 0

class DeveloperSeedRequest(BaseModel):
    email: str = "admin@aasaanapp.com"
    password: str = "AasaanAdmin2026!"
    name: str = "AasaanApp Developer"

# ===== SUBSCRIPTION / RECHARGE MODELS =====

class BillingCycleConfig(BaseModel):
    cycle: str  # monthly, quarterly, half_yearly, yearly
    months: int
    discount_percent: float = 0
    enabled: bool = True

class SlabRate(BaseModel):
    min_chapters: int
    max_chapters: int
    rate: float = 0

class FreeTrialConfig(BaseModel):
    enabled: bool = True
    duration_days: int = 30
    max_chapters: int = 1

class SubscriptionSettingsUpdate(BaseModel):
    pricing_model: Optional[str] = None  # per_chapter, slab, per_member
    billing_cycles: Optional[List[BillingCycleConfig]] = None
    per_chapter_rate: Optional[float] = None
    slab_rates: Optional[List[SlabRate]] = None
    per_member_rate: Optional[float] = None
    free_trial: Optional[FreeTrialConfig] = None
    gst_percent: Optional[float] = None

class SubscriptionActivate(BaseModel):
    superadmin_id: str
    billing_cycle: str  # monthly, quarterly, half_yearly, yearly
    chapters_allowed: int
    amount_paid: float
    payment_method: str  # razorpay, bank_transfer, cash, other
    payment_ref: str = ""

class SubscriptionExtend(BaseModel):
    subscription_id: str
    additional_months: int
    amount_paid: float
    payment_ref: str = ""

class SubscriptionCancel(BaseModel):
    subscription_id: str

# ===== ENHANCED CHAPTER MODEL =====

class ChapterCreateEnhanced(BaseModel):
    name: str
    admin_mobile: str
    admin_password: str
    region: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None