from charge import charge_card  # noqa: F401


def refund(charge_id: str, amount_cents: int) -> dict:
    return {"refund_id": f"re_{charge_id[3:]}", "amount": amount_cents, "status": "processed"}
