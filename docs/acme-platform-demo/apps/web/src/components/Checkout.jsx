export default function Checkout({ items }) {
  const total = items.reduce((sum, i) => sum + i.price, 0);

  async function pay() {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items.map((i) => i.id), total }),
    });
    if (!res.ok) alert("Payment failed, please try again");
  }

  return (
    <section>
      <h2>Cart ({items.length})</h2>
      <p>Total: ${total.toFixed(2)}</p>
      <button disabled={!items.length} onClick={pay}>Pay now</button>
    </section>
  );
}
