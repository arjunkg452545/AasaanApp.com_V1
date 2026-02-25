import qrcode
from io import BytesIO
from cryptography.fernet import Fernet
import base64
import json
from datetime import datetime, timezone
import os

# Get encryption key from environment - required
QR_KEY = os.environ.get("QR_ENCRYPTION_KEY")
if not QR_KEY:
    raise ValueError("QR_ENCRYPTION_KEY environment variable is required but not set")

ENCRYPTION_KEY = QR_KEY.encode()
# Ensure key is exactly 32 bytes for Fernet
ENCRYPTION_KEY = base64.urlsafe_b64encode(ENCRYPTION_KEY.ljust(32)[:32])
cipher = Fernet(ENCRYPTION_KEY)

def generate_qr_token(meeting_id: str, chapter_id: str, attendance_type: str = "member") -> str:
    """Generate encrypted QR token with meeting info, type and timestamp"""
    data = {
        "meeting_id": meeting_id,
        "chapter_id": chapter_id,
        "attendance_type": attendance_type,  # member, substitute, visitor
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    json_data = json.dumps(data).encode()
    encrypted = cipher.encrypt(json_data)
    token = base64.urlsafe_b64encode(encrypted).decode()
    return token

def verify_qr_token(token: str) -> dict:
    """Verify and decrypt QR token - with fallback for legacy tokens"""
    # Try with current cipher first
    try:
        encrypted = base64.urlsafe_b64decode(token.encode())
        decrypted = cipher.decrypt(encrypted)
        data = json.loads(decrypted.decode())
        
        # Check if token is not too old (valid for 24 hours for flexibility)
        token_time = datetime.fromisoformat(data["timestamp"])
        now = datetime.now(timezone.utc)
        
        if (now - token_time).total_seconds() > 86400:  # 24 hours
            return None
        
        return data
    except Exception as e:
        # Fallback: Try with alternative common keys for backward compatibility
        fallback_keys = [
            "BNI_ATTENDANCE_LEGACY_KEY_001",
            "BNI_ATTENDANCE_DEFAULT_KEY_001"
        ]
        
        for fallback_key in fallback_keys:
            try:
                key = base64.urlsafe_b64encode(fallback_key.encode().ljust(32)[:32])
                fallback_cipher = Fernet(key)
                encrypted = base64.urlsafe_b64decode(token.encode())
                decrypted = fallback_cipher.decrypt(encrypted)
                data = json.loads(decrypted.decode())
                
                # Check timestamp
                token_time = datetime.fromisoformat(data["timestamp"])
                now = datetime.now(timezone.utc)
                
                if (now - token_time).total_seconds() <= 86400:
                    return data
            except Exception:
                continue
        
        return None

def create_qr_image(token: str, request_host: str = None) -> bytes:
    """Create QR code image from token
    
    Args:
        token: QR token string
        request_host: DEPRECATED - not used anymore.
    """
    # IMPORTANT: Hardcoded custom domain for QR codes
    # Emergent overrides FRONTEND_URL during deployment with their own URL
    # So we must hardcode the white-label/custom domain here
    # This ensures QR codes always point to the correct production domain
    frontend_url = "https://aasaanapp.com"
    
    # Remove trailing slash if present
    frontend_url = frontend_url.rstrip('/')
    
    qr_url = f"{frontend_url}/attendance?token={token}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    
    return buffer.getvalue()