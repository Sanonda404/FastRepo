from flask import Flask, jsonify, request
from orders import create_order, list_orders

app = Flask(__name__)


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.get("/api/orders")
def get_orders():
    return jsonify(list_orders())


@app.post("/api/orders")
def post_order():
    data = request.get_json(force=True)
    order = create_order(data["items"], data["total"])
    return jsonify(order), 201


if __name__ == "__main__":
    app.run(port=5000)
