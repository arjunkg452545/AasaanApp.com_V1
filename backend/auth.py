from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
import os

SECRET_KEY = os.environ.get("JWT_SECRET")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET environment variable is required but not set")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30  # Legacy default

# Role-based expiry
MEMBER_TOKEN_EXPIRE_DAYS = 90   # Members/admin (Blinkit/Zomato style)
STAFF_TOKEN_EXPIRE_DAYS = 7     # SuperAdmin, developer, accountant

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expire_days: int = None):
    """Create JWT. Returns (token, expires_at_iso_string).
    expire_days: override. If None, uses role-based default.
    """
    to_encode = data.copy()
    role = data.get("role", "")
    if expire_days is None:
        if role in ("member", "admin"):
            expire_days = MEMBER_TOKEN_EXPIRE_DAYS
        elif role in ("superadmin", "developer", "accountant"):
            expire_days = STAFF_TOKEN_EXPIRE_DAYS
        else:
            expire_days = ACCESS_TOKEN_EXPIRE_DAYS
    expire = datetime.now(timezone.utc) + timedelta(days=expire_days)
    issued_at = datetime.now(timezone.utc)
    to_encode.update({
        "exp": expire,
        "iat": issued_at,
        "expires_at": expire.isoformat(),
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, expire.isoformat()

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
