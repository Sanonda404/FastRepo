import itertools

_ids = itertools.count(1)
_ORDERS = []


def create_order(item_ids, total):
    order = {"id": next(_ids), "items": item_ids, "total": total, "status": "pending"}
    _ORDERS.append(order)
    return order


def list_orders():
    return _ORDERS
