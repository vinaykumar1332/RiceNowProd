import React, { useEffect, useState } from "react";
import Cards from "./cards/cards"; // adjust path if your project structure differs
import "./Home.css";
import {VITE_PRODUCTS_API} from "../../API"
const PRODUCTS_API = VITE_PRODUCTS_API; // will be injected by Vite

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!PRODUCTS_API) {
      setError("Products API not configured.");
      setLoading(false);
      return;
    }

    fetch(PRODUCTS_API, {
      method: "GET",
      mode: "cors", // server must allow CORS
      headers: {
        Accept: "application/json",
      },
      credentials: "omit",
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Fetch error ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then((data) => {
        // normalize common wrappers
        if (Array.isArray(data)) setProducts(data);
        else if (Array.isArray(data?.products)) setProducts(data.products);
        else if (Array.isArray(data?.rows)) setProducts(data.rows);
        else if (Array.isArray(data?.data)) setProducts(data.data);
        else {
          console.warn("Unexpected data shape from products API", data);
          setProducts([]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch products", err);
        setError(err.message || "Failed to fetch products");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
      <h1>Welcome to Ricenow</h1>
      <p>This is the homepage.</p>

      {loading && <p>Loading products…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && !error && products.length === 0 && <p>No products found.</p>}

      <div style={{ marginTop: 20 }}>
        <div className="cards-parent">
          {products.map((p, idx) => (
            <Cards key={p.id ?? p.title ?? idx} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
