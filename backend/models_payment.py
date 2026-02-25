"""
Pydantic models for the Complete Payment System.
Covers: member auth, payment config, fee ledger, proof submission,
admin verification, accountant approval, reminders, and gateway stubs.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


# ===== MEMBER AUTH MODELS =====

class MemberLoginRequest(BaseModel):
    mobile: str
    password: str


class MemberLoginResponse(BaseModel):
    token: str
    role: str = "member"
    member_id: str
    chapter_id: str
    member_name: str
    chapter_name: str = ""


class MemberSetPasswordRequest(BaseModel):
    password: str


class MemberChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ===== PAYMENT CONFIGURATION MODELS =====

class DefaultFees(BaseModel):
    kitty_amount: float = 0
    meeting_fee: float = 0
    induction_fee: float = 0
    renewal_fee: float = 0


class PaymentConfigUpdate(BaseModel):
    # UPI Settings
    upi_id: Optional[str] = None
    upi_holder_name: Optional[str] = None
    upi_qr_data: Optional[str] = None  # Base64 or URL for QR image

    # Bank Details
    bank_enabled: bool = False
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None

    # Manual Payment
    manual_payment_enabled: bool = True

    # Verification Settings
    require_screenshot: bool = True
    require_utr: bool = True
    two_level_verification: bool = True  # admin confirms + ED/accountant approves

    # Default Fee Amounts
    default_fees: Optional[DefaultFees] = None

    # Gateway (future)
    gateway_enabled: bool = False
    gateway_provider: Optional[str] = None  # razorpay, paytm, phonepe


class CustomFee(BaseModel):
    name: str
    amount: float
    fee_type: str  # One-time identifier


class ChapterFeeConfigUpdate(BaseModel):
    kitty_amount: Optional[float] = None
    meeting_fee: Optional[float] = None
    induction_fee: Optional[float] = None
    renewal_fee: Optional[float] = None
    custom_fees: List[CustomFee] = []


# ===== FEE LEDGER MODELS =====

class FeeLedgerCreate(BaseModel):
    fee_type: str  # kitty, meeting_fee, induction_fee, renewal_fee, misc, event, custom
    member_id: str
    amount: float
    month: Optional[int] = None  # 1-12
    year: Optional[int] = None
    due_date: Optional[str] = None
    description: Optional[str] = None


class FeeGenerateMonthly(BaseModel):
    month: int  # 1-12
    year: int
    fee_types: List[str] = ["kitty", "meeting_fee"]  # Which fee types to generate


class FeeCustomCreate(BaseModel):
    fee_type: str = "custom"
    member_ids: List[str]  # Can be multiple members
    amount: float
    description: str
    due_date: Optional[str] = None


class FeeWaive(BaseModel):
    reason: str


# ===== PAYMENT PROOF / SUBMISSION MODELS =====

class PaymentProofSubmit(BaseModel):
    payment_method: str  # upi, neft, imps, cash, cheque, gateway
    utr_number: Optional[str] = None
    payment_date: Optional[str] = None  # ISO date string
    note: Optional[str] = None


# ===== ADMIN VERIFICATION MODELS =====

class AdminVerifyAction(BaseModel):
    note: Optional[str] = None


class AdminRejectAction(BaseModel):
    reason: str


class AdminBulkConfirm(BaseModel):
    ledger_ids: List[str]
    note: Optional[str] = None


class AdminMarkCash(BaseModel):
    member_id: str
    ledger_id: Optional[str] = None  # If paying against existing fee
    fee_type: Optional[str] = None  # If creating new entry
    amount: float
    payment_method: str = "cash"  # cash, cheque
    note: Optional[str] = None
    cheque_number: Optional[str] = None
    month: Optional[int] = None
    year: Optional[int] = None


# ===== ACCOUNTANT / ED APPROVAL MODELS =====

class AccountantCreate(BaseModel):
    name: str
    mobile: str
    email: Optional[str] = None
    password: str


class AccountantLoginRequest(BaseModel):
    mobile: str
    password: str


class AccountantLoginResponse(BaseModel):
    token: str
    role: str = "accountant"
    accountant_id: str
    name: str
    superadmin_id: str


class BulkApproveRequest(BaseModel):
    ledger_ids: List[str]
    note: Optional[str] = None


class BankStatementMatch(BaseModel):
    ledger_id: str
    utr_number: str
    amount: float
    date: str


class BankStatementConfirm(BaseModel):
    matches: List[BankStatementMatch]
    note: Optional[str] = None


# ===== REMINDER MODELS =====

class ReminderRequest(BaseModel):
    member_ids: List[str]
    fee_type: Optional[str] = None
    month: Optional[int] = None
    year: Optional[int] = None
    custom_message: Optional[str] = None


class ReminderTemplate(BaseModel):
    template_id: Optional[str] = None
    name: str
    fee_type: str  # kitty, meeting_fee, general, custom
    message_template: str  # Template with {name}, {amount}, {month}, {year}, {upi_id}, {chapter}


# ===== GATEWAY MODELS (STUBS) =====

class GatewayOrderCreate(BaseModel):
    ledger_id: str
    provider: str  # razorpay, paytm, phonepe


class GatewayOrderResponse(BaseModel):
    order_id: str
    provider: str
    amount: float
    currency: str = "INR"
    status: str = "created"
    gateway_data: dict = {}


class GatewayVerify(BaseModel):
    order_id: str
    payment_id: str
    signature: str
