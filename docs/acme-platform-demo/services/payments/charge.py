"""Payments service: card charging. RESTRICTED to the Payments team."""
import os
import uuid

PROVIDER_KEY = os.getenv("PAYMENT_PROVIDER_KEY", "sk_test_EXAMPLE_NOT_A_REAL_KEY")


def charge_card(amount_cents: int, currency: str, token: str) -> dict:
    if amount_cents <= 0:
        raise ValueError("amount must be positive")
    # A real provider call would go here.
    return {
        "charge_id": f"ch_{uuid.uuid4().hex[:12]}",
        "amount": amount_cents,
        "currency": currency,
        "status": "succeeded",
    }
