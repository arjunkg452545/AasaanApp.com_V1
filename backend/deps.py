"""
Shared FastAPI dependencies for authentication and role-based access.
Route modules import from here instead of server.py to avoid circular imports.
"""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth import verify_token

security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
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
