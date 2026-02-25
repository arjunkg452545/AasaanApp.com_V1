"""
Payment Gateway Routes — Stubs
- List supported gateways
- Create order (coming soon)
- Verify payment (coming soon)
- Webhook handler (coming soon)
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional

from database import db
from deps import require_role
from models_payment import GatewayOrderCreate, GatewayVerify

router = APIRouter(prefix="/api")


SUPPORTED_GATEWAYS = [
    {
        "name": "Razorpay",
        "provider": "razorpay",
        "status": "coming_soon",
        "description": "Accept payments via cards, UPI, netbanking, and wallets",
        "logo": "https://razorpay.com/assets/razorpay-logo.svg",
    },
    {
        "name": "Paytm",
        "provider": "paytm",
        "status": "coming_soon",
        "description": "Paytm payment gateway for online payments",
        "logo": "https://paytm.com/favicon.ico",
    },
    {
        "name": "PhonePe",
        "provider": "phonepe",
        "status": "coming_soon",
        "description": "PhonePe business payment gateway",
        "logo": "https://www.phonepe.com/favicon.ico",
    },
]


@router.get("/gateway/supported")
async def list_supported_gateways():
    """List all supported payment gateways and their status."""
    return SUPPORTED_GATEWAYS


@router.post("/member/gateway/create-order")
async def create_gateway_order(
    data: GatewayOrderCreate,
    user=Depends(require_role("member")),
):
    """Create a payment order through a gateway. (Coming Soon)"""
    return {
        "error": "coming_soon",
        "message": f"Online payment via {data.provider} is coming soon. Please use UPI or bank transfer for now.",
    }


@router.post("/member/gateway/verify")
async def verify_gateway_payment(
    data: GatewayVerify,
    user=Depends(require_role("member")),
):
    """Verify a gateway payment. (Coming Soon)"""
    return {
        "error": "coming_soon",
        "message": "Payment verification is not yet available.",
    }


@router.post("/webhook/gateway")
async def gateway_webhook(request: Request):
    """Handle webhook callbacks from payment gateways. (Coming Soon)"""
    body = await request.body()
    # In production, validate the webhook signature here
    return {"status": "received", "message": "Webhook handler not yet implemented"}
