"""
Provider-agnostic OTP service.
Reads config from DB, picks provider adapter, sends/verifies OTP.
Provider adapters are skeleton functions — actual API calls added later.
"""
import random
import string
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from auth import pwd_context
from database import db


class OTPService:
    """Stateless OTP service. All state lives in MongoDB."""

    async def _get_config(self) -> dict:
        config = await db.otp_config.find_one({"config_id": "default"}, {"_id": 0})
        if not config:
            raise RuntimeError("OTP config not found")
        return config

    def _generate_otp(self, length: int = 6) -> str:
        return "".join(random.choices(string.digits, k=length))

    def _hash_otp(self, otp: str) -> str:
        return pwd_context.hash(otp)

    def _verify_otp_hash(self, plain_otp: str, hashed: str) -> bool:
        return pwd_context.verify(plain_otp, hashed)

    async def send_otp(self, mobile: str, ip_address: str = "") -> dict:
        """Generate OTP, store in otp_logs, send via configured provider."""
        config = await self._get_config()

        if not config.get("enabled", False):
            return {"success": False, "error": "OTP login not enabled"}

        # Rate limit: daily limit per number
        daily_limit = config.get("daily_limit_per_number", 5)
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = await db.otp_logs.count_documents({
            "mobile": mobile,
            "sent_at": {"$gte": today_start.isoformat()},
        })
        if today_count >= daily_limit:
            return {"success": False, "error": f"Daily OTP limit ({daily_limit}) exceeded for this number"}

        otp_length = config.get("otp_length", 6)
        expiry_minutes = config.get("expiry_minutes", 5)
        otp = self._generate_otp(otp_length)
        otp_hash = self._hash_otp(otp)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)

        # Store in otp_logs
        log_entry = {
            "log_id": str(uuid4()),
            "mobile": mobile,
            "otp_hash": otp_hash,
            "provider": config.get("provider", "msg91"),
            "status": "sent",
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at.isoformat(),
            "used_at": None,
            "ip_address": ip_address,
            "cost_estimate": 0.15,
        }
        await db.otp_logs.insert_one(log_entry)

        # Send via provider adapter
        provider = config.get("provider", "msg91")
        send_result = await self._dispatch_provider(provider, mobile, otp, config)

        if not send_result.get("success", False):
            await db.otp_logs.update_one(
                {"log_id": log_entry["log_id"]},
                {"$set": {"status": "failed"}},
            )
            return {"success": False, "error": send_result.get("error", "Provider send failed")}

        return {"success": True, "expires_in": expiry_minutes * 60}

    async def verify_otp(self, mobile: str, otp: str) -> dict:
        """Verify OTP against latest unused log entry."""
        # Find latest unused OTP for this mobile
        log = await db.otp_logs.find_one(
            {"mobile": mobile, "status": "sent"},
            {"_id": 0},
            sort=[("sent_at", -1)],
        )
        if not log:
            return {"verified": False, "error": "No OTP found. Please request a new one."}

        # Check expiry
        expires_at = datetime.fromisoformat(log["expires_at"])
        if not expires_at.tzinfo:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            await db.otp_logs.update_one(
                {"log_id": log["log_id"]}, {"$set": {"status": "expired"}}
            )
            return {"verified": False, "error": "OTP has expired. Please request a new one."}

        # Verify hash
        if not self._verify_otp_hash(otp, log["otp_hash"]):
            return {"verified": False, "error": "Invalid OTP"}

        # Mark as used
        await db.otp_logs.update_one(
            {"log_id": log["log_id"]},
            {"$set": {"status": "used", "used_at": datetime.now(timezone.utc).isoformat()}},
        )
        return {"verified": True}

    # ===== Provider Adapters (skeletons — actual API calls added later) =====

    async def _dispatch_provider(self, provider: str, mobile: str, otp: str, config: dict) -> dict:
        adapters = {
            "msg91": self._send_via_msg91,
            "2factor": self._send_via_2factor,
            "twilio": self._send_via_twilio,
            "gupshup": self._send_via_gupshup,
            "custom": self._send_via_custom,
        }
        adapter = adapters.get(provider, self._send_via_msg91)
        return await adapter(mobile, otp, config)

    async def _send_via_msg91(self, mobile: str, otp: str, config: dict) -> dict:
        # TODO: Implement MSG91 API call
        # api_key = config.get("api_key", "")
        # template_id = config.get("template_id", "")
        return {"success": True, "provider": "msg91", "message": "Placeholder — MSG91 not yet integrated"}

    async def _send_via_2factor(self, mobile: str, otp: str, config: dict) -> dict:
        # TODO: Implement 2Factor API call
        return {"success": True, "provider": "2factor", "message": "Placeholder — 2Factor not yet integrated"}

    async def _send_via_twilio(self, mobile: str, otp: str, config: dict) -> dict:
        # TODO: Implement Twilio API call
        return {"success": True, "provider": "twilio", "message": "Placeholder — Twilio not yet integrated"}

    async def _send_via_gupshup(self, mobile: str, otp: str, config: dict) -> dict:
        # TODO: Implement Gupshup API call
        return {"success": True, "provider": "gupshup", "message": "Placeholder — Gupshup not yet integrated"}

    async def _send_via_custom(self, mobile: str, otp: str, config: dict) -> dict:
        # TODO: Implement custom webhook/API call
        return {"success": True, "provider": "custom", "message": "Placeholder — Custom provider not yet integrated"}


# Singleton
otp_service = OTPService()
