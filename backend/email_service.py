"""
Email OTP Service for AasaanApp — Hostinger SMTP.
Used for forgot-password flow: sends OTP to member's registered email.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

SMTP_HOST = "smtp.hostinger.com"
SMTP_PORT = 465
SMTP_USER = "app@aasaanapp.com"
SMTP_PASS = "AasaanApp@2026!"
FROM_NAME = "AasaanApp"


def send_otp_email(to_email: str, otp: str, member_name: str = "Member") -> bool:
    """Send OTP email via Hostinger SMTP_SSL. Returns True on success."""
    subject = f"AasaanApp - Password Reset OTP: {otp}"
    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
        <div style="text-align:center;margin-bottom:20px;">
            <h2 style="color:#CF2030;margin:0;">AasaanApp</h2>
            <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">BNI Management System</p>
        </div>
        <div style="background:#fff;border-radius:8px;padding:24px;border:1px solid #e5e7eb;">
            <p style="color:#111;font-size:15px;">Hi <strong>{member_name}</strong>,</p>
            <p style="color:#374151;font-size:14px;">You requested a password reset. Use this OTP to verify your identity:</p>
            <div style="text-align:center;margin:24px 0;">
                <span style="display:inline-block;background:#CF2030;color:#fff;font-size:28px;font-weight:bold;letter-spacing:8px;padding:12px 32px;border-radius:8px;">{otp}</span>
            </div>
            <p style="color:#6b7280;font-size:13px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
            <p style="color:#6b7280;font-size:13px;">If you didn't request this, please ignore this email.</p>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px;">
            &copy; AasaanApp &mdash; An SIPL Product
        </p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{FROM_NAME} <{SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        logger.info(f"OTP email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email}: {e}")
        return False
