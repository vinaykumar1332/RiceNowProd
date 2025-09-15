import React, { useEffect, useState } from "react";
import Cards from "./cards/cards";
import "./Home.css";

import { VITE_PRODUCTS_API } from "../../API.js"; // adjust path if api.js is not in src/

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!VITE_PRODUCTS_API) {
      setError("Products API not configured in api.js");
      setLoading(false);
      return;
    }

    fetch(VITE_PRODUCTS_API, {
      method: "GET",
      mode: "cors",
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
        if (Array.isArray(data)) {
          setProducts(data);
        } else if (data?.products && Array.isArray(data.products)) {
          setProducts(data.products);
        } else if (data?.rows && Array.isArray(data.rows)) {
          setProducts(data.rows);
        } else if (data?.data && Array.isArray(data.data)) {
          setProducts(data.data);
        } else {
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
          {products.map((p) => (
            <Cards key={p.id ?? `${p.title}-${Math.random()}`} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
