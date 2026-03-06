"""
Shared FastAPI dependencies for authentication and role-based access.
Route modules import from here instead of server.py to avoid circular imports.
"""
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth import verify_token
from typing import Optional

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """
    Try httpOnly cookie first, then fall back to Authorization: Bearer header.
    This keeps backward compatibility while enabling cookie-based JWT.
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
    return payload


def require_role(*allowed_roles):
    """Dependency factory: returns a dependency that checks the user's role."""
    async def _check(user=Depends(get_current_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return _check
