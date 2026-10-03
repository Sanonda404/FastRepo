import { useState } from "react";
import Checkout from "./components/Checkout";

const PRODUCTS = [
  { id: 1, name: "Trail Runner Shoes", price: 89.0 },
  { id: 2, name: "Insulated Bottle", price: 24.5 },
  { id: 3, name: "Merino Socks (3-pack)", price: 32.0 },
];

export default function App() {
  const [cart, setCart] = useState([]);
  const add = (p) => setCart((c) => [...c, p]);

  return (
    <main>
      <h1>Acme Store</h1>
      <ul>
        {PRODUCTS.map((p) => (
          <li key={p.id}>
            {p.name} - ${p.price.toFixed(2)}
            <button onClick={() => add(p)}>Add to cart</button>
          </li>
        ))}
      </ul>
      <Checkout items={cart} />
    </main>
  );
}
