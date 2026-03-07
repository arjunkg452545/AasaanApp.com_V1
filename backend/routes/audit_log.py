"""Developer audit log: track important system actions."""
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from datetime import datetime, timezone
import uuid
from typing import Optional

from database import db
from deps import require_role, get_current_user

router = APIRouter(prefix="/api", tags=["audit-log"])


async def log_audit(user_id: str, role: str, action: str, entity_type: str,
                    entity_id: str = "", details: str = "", ip: str = ""):
    """Helper to create an audit log entry. Call from other routes."""
    await db.audit_logs.insert_one({
        "log_id": str(uuid.uuid4()),
        "user_id": user_id,
        "role": role,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details,
        "ip": ip,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


@router.get("/developer/audit-logs")
async def get_audit_logs(
    role: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user=Depends(require_role("developer")),
):
    """Get audit logs with filters and pagination."""
    query = {}
    if role:
        query["role"] = role
    if action:
        query["action"] = action
    if from_date:
        query.setdefault("timestamp", {})["$gte"] = from_date
    if to_date:
        query.setdefault("timestamp", {})["$lte"] = to_date

    total = await db.audit_logs.count_documents(query)
    skip = (page - 1) * limit
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)

    return {"logs": logs, "total": total, "page": page, "limit": limit}
