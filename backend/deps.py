"""
Shared FastAPI dependencies for authentication and role-based access.
Route modules import from here instead of server.py to avoid circular imports.
"""
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth import verify_token
from typing import Optional
from datetime import datetime, timezone

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    Try httpOnly cookie first, then fall back to Authorization: Bearer header.
    This keeps backward compatibility while enabling cookie-based JWT.
    Also checks password_changed_at for member tokens (invalidates old tokens).
    """
    token = None

    # 1) Try httpOnly cookie
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        token = cookie_token

    # 2) Fall back to Authorization header
    if not token and credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Password change invalidation: if member changed password after token was issued
    member_id = payload.get("member_id")
    if member_id:
        from database import db
        creds = await db.member_credentials.find_one(
            {"member_id": member_id},
            {"_id": 0, "password_changed_at": 1, "is_active": 1}
        )
        if creds:
            if not creds.get("is_active", True):
                raise HTTPException(status_code=403, detail="Account is disabled")
            pw_changed = creds.get("password_changed_at")
            token_iat = payload.get("iat")
            if pw_changed and token_iat:
                # Compare: if password was changed after token was issued, reject
                if isinstance(token_iat, (int, float)):
                    token_issued = datetime.fromtimestamp(token_iat, tz=timezone.utc)
                else:
                    token_issued = datetime.fromisoformat(str(token_iat))
                pw_changed_dt = datetime.fromisoformat(pw_changed)
                if not pw_changed_dt.tzinfo:
                    pw_changed_dt = pw_changed_dt.replace(tzinfo=timezone.utc)
                if pw_changed_dt > token_issued:
                    raise HTTPException(
                        status_code=401,
                        detail="Password was changed. Please log in again."
                    )

    return payload


def require_role(*allowed_roles):
    """Dependency factory: returns a dependency that checks the user's role."""
    async def _check(user=Depends(get_current_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return _check
