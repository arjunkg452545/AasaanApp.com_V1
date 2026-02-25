"""
Abstract Payment Gateway base class + provider stubs.
Each provider implements: create_order, verify_payment, handle_webhook.
All raise NotImplementedError until integrated.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any


class PaymentGateway(ABC):
    """Base class for all payment gateway providers."""

    @abstractmethod
    async def create_order(self, amount: float, currency: str, receipt: str, notes: Dict[str, Any] = None) -> Dict:
        """Create a payment order with the gateway."""
        raise NotImplementedError

    @abstractmethod
    async def verify_payment(self, order_id: str, payment_id: str, signature: str) -> bool:
        """Verify that a payment was successful."""
        raise NotImplementedError

    @abstractmethod
    async def handle_webhook(self, payload: Dict[str, Any], headers: Dict[str, str]) -> Dict:
        """Handle a webhook callback from the gateway."""
        raise NotImplementedError

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the provider name."""
        raise NotImplementedError


class RazorpayGateway(PaymentGateway):
    """Razorpay payment gateway — stub."""

    def __init__(self, key_id: str = "", key_secret: str = ""):
        self.key_id = key_id
        self.key_secret = key_secret

    async def create_order(self, amount, currency="INR", receipt="", notes=None):
        raise NotImplementedError("Razorpay integration coming soon")

    async def verify_payment(self, order_id, payment_id, signature):
        raise NotImplementedError("Razorpay integration coming soon")

    async def handle_webhook(self, payload, headers):
        raise NotImplementedError("Razorpay integration coming soon")

    def get_provider_name(self):
        return "razorpay"


class PaytmGateway(PaymentGateway):
    """Paytm payment gateway — stub."""

    def __init__(self, merchant_id: str = "", merchant_key: str = ""):
        self.merchant_id = merchant_id
        self.merchant_key = merchant_key

    async def create_order(self, amount, currency="INR", receipt="", notes=None):
        raise NotImplementedError("Paytm integration coming soon")

    async def verify_payment(self, order_id, payment_id, signature):
        raise NotImplementedError("Paytm integration coming soon")

    async def handle_webhook(self, payload, headers):
        raise NotImplementedError("Paytm integration coming soon")

    def get_provider_name(self):
        return "paytm"


class PhonePeGateway(PaymentGateway):
    """PhonePe payment gateway — stub."""

    def __init__(self, merchant_id: str = "", salt_key: str = ""):
        self.merchant_id = merchant_id
        self.salt_key = salt_key

    async def create_order(self, amount, currency="INR", receipt="", notes=None):
        raise NotImplementedError("PhonePe integration coming soon")

    async def verify_payment(self, order_id, payment_id, signature):
        raise NotImplementedError("PhonePe integration coming soon")

    async def handle_webhook(self, payload, headers):
        raise NotImplementedError("PhonePe integration coming soon")

    def get_provider_name(self):
        return "phonepe"


# Factory
GATEWAY_PROVIDERS = {
    "razorpay": RazorpayGateway,
    "paytm": PaytmGateway,
    "phonepe": PhonePeGateway,
}


def get_gateway(provider: str, **kwargs) -> PaymentGateway:
    """Get a gateway instance by provider name."""
    cls = GATEWAY_PROVIDERS.get(provider)
    if not cls:
        raise ValueError(f"Unknown gateway provider: {provider}")
    return cls(**kwargs)
