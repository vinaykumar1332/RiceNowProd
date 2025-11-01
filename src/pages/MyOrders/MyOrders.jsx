import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import PropTypes from "prop-types";
import "./MyOrders.css";
import { FaSearchengin } from "react-icons/fa6";
import { VITE_ORDERS_API } from "../../API";
const DEFAULT_API = VITE_ORDERS_API;

/* Status map */
const STATUS_STYLES = {
  opened: { label: "Opened", color: "#06b6d4" },
  "in-progress": { label: "In Progress", color: "#f59e0b" },
  "out-for-delivery": { label: "Out for Delivery", color: "#0891b2" },
  delivered: { label: "Delivered", color: "#10b981" },
  cancelled: { label: "Cancelled", color: "#ef4444" },
  returned: { label: "Returned", color: "#7c3aed" },
  working: { label: "Working", color: "#f59e0b" },
  other: { label: "Other", color: "#64748b" },
};

/* small helpers (parsing functions kept concise) */
function formatDate(utcDate) {
  if (!utcDate) return "N/A";
  try {
    return new Date(utcDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return utcDate;
  }
}
function shorten(text = "", max = 80) {
  return text?.length <= max ? text : text?.slice(0, max).trim() + "...";
}
function normalizeStatus(rawStatus) {
  if (!rawStatus) return "other";
  const s = String(rawStatus).trim().toLowerCase();
  if (s === "opened" || s === "open") return "opened";
  if (s === "working") return "working";
  if (s.includes("progress") || s === "processing" || s === "inprogress" || s === "in progress") return "in-progress";
  if ((s.includes("out") && s.includes("delivery")) || s.includes("out for delivery") || s.includes("out-for-delivery")) return "out-for-delivery";
  if (s === "delivered" || s === "completed") return "delivered";
  if (s === "cancelled" || s === "canceled" || s === "cancel" || s.includes("canca") || s.includes("cance")) return "cancelled";
  if (s === "returned" || s === "return") return "returned";
  return "other";
}

/* Items parsing (kept similar to prior implementation) */
function parseUnitPrices(raw, numItems) {
  if (!raw || numItems === 0) return Array(numItems).fill(0);
  if (Array.isArray(raw)) return raw.slice(0, numItems).map(v => parseInt(String(v).replace(/[^\d]/g, "")) || 0);
  const s = String(raw).trim();
  if (s.includes(",")) {
    const parts = s.split(",").map(p => parseInt(p.trim().replace(/[^\d]/g, ""), 10) || 0);
    return parts.slice(0, numItems).concat(Array(Math.max(0, numItems - parts.length)).fill(0));
  }
  if (/^\d+$/.test(s) && s.length >= 3 * numItems && numItems > 0) {
    const groups = [];
    let rest = s;
    while (rest.length > 0) {
      groups.unshift(parseInt(rest.slice(-3), 10));
      rest = rest.slice(0, -3);
    }
    return groups.slice(-numItems).concat(Array(Math.max(0, numItems - groups.length)).fill(0));
  }
  const n = parseInt(s.replace(/[^\d]/g, ""), 10) || 0;
  return numItems === 1 ? [n] : [n].concat(Array(numItems - 1).fill(0));
}
function parseItemName(line) {
  const clean = line.replace(/^\.\s+/, "").trim();
  const m = clean.match(/^(.*?)(?:\s+([^\s×x]+))?\s*[×x]\s*(\d+)\s*$/i);
  if (m) return { name: (m[1] || "").trim(), unit: (m[2] || "").trim(), qty: parseInt(m[3] || "0", 10) };
  return { name: clean, unit: "", qty: 0 };
}
function computeItems(order) {
  const rawLines = String(order["Items (Summary)"] || "").split("\n").map(l => l.trim()).filter(Boolean);
  const quantitiesRaw = String(order["Quantities"] ?? "");
  const quantities = quantitiesRaw.includes(",") ? quantitiesRaw.split(",").map(q => parseInt(q.trim(), 10) || 0) : (quantitiesRaw === "" ? [] : [parseInt(quantitiesRaw, 10) || 0]);
  const numItems = Math.max(rawLines.length, quantities.length, 0);
  const unitPrices = parseUnitPrices(order["Unit Prices"] ?? order["UnitPrices"] ?? "", numItems);
  const brandsRaw = String(order["Brands"] ?? "").trim();
  const brands = brandsRaw ? brandsRaw.split(".").map(b => b.trim()).filter(Boolean) : [];
  const items = rawLines.map((line, idx) => {
    const parsed = parseItemName(line);
    const qty = quantities[idx] ?? parsed.qty ?? 0;
    const unitPrice = unitPrices[idx] ?? 0;
    const subtotal = (Number(qty) || 0) * (Number(unitPrice) || 0);
    return { brand: brands[idx] || "", name: parsed.name || "", unit: parsed.unit || "", qty: qty || 0, unitPrice: unitPrice || 0, subtotal };
  });
  if (quantities.length > items.length) {
    for (let i = items.length; i < quantities.length; i++) {
      const qty = quantities[i] || 0;
      const unitPrice = unitPrices[i] || 0;
      items.push({ brand: brands[i] || "", name: "Item", unit: "", qty, unitPrice, subtotal: qty * unitPrice });
    }
  }
  return items;
}

/* Component */
export default function MyOrders({ apiUrl }) {
  const VITE_ORDERS_API_var = apiUrl || DEFAULT_API;

  const [mobile, setMobile] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [statusCounts, setStatusCounts] = useState({});
  const [openOrderId, setOpenOrderId] = useState(null);

  const contentRefs = useRef({});
  const resultRef = useRef(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("savedMobile");
    if (saved) { setMobile(saved); searchOrders(saved); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sanitizeMobileInput = (value) => value.replace(/\D/g, "").slice(0, 10);
  const handleMobileChange = (e) => { setMobile(sanitizeMobileInput(e.target.value)); setErrorMsg(""); };
  const validateMobile = (m) => /^\d{10}$/.test(m);

  async function searchOrders(overrideMobile) {
    const m = (overrideMobile ?? mobile).trim();
    setErrorMsg("");
    setOrders([]);
    setActiveFilter("all");
    setStatusCounts({});
    setOpenOrderId(null);

    if (!validateMobile(m)) { setErrorMsg("Please enter a valid 10-digit mobile number."); return; }
    sessionStorage.setItem("savedMobile", m);
    setLoading(true);

    if (!VITE_ORDERS_API_var) {
      setErrorMsg("Orders API not configured. Provide apiUrl prop or set VITE_ORDERS_API.");
      setLoading(false);
      return;
    }

    try {
      // intentional small delay to show animation in dev/testing (remove in prod)
      // await new Promise(r => setTimeout(r, 250));
      const resp = await fetch(`${VITE_ORDERS_API_var}?mobile=${encodeURIComponent(m)}`);
      if (!resp.ok) { const text = await resp.text().catch(() => ""); throw new Error(`Network error ${resp.status}: ${text}`); }
      const data = await resp.json();
      const rawArray = Array.isArray(data.orders) ? data.orders : (Array.isArray(data) ? data : (data.orders || []));
      if (!Array.isArray(rawArray) || rawArray.length === 0) {
        setErrorMsg(data?.message || "No orders found for this number.");
        setOrders([]); setStatusCounts({}); setLoading(false);
        return;
      }
      const normalized = rawArray.map((o) => ({ ...o, _statusKey: normalizeStatus(o?.Status ?? o?.status ?? ""), items: computeItems(o) }));
      setOrders(normalized);
      const counts = {};
      normalized.forEach((o) => { const k = o._statusKey || "other"; counts[k] = (counts[k] || 0) + 1; });
      setStatusCounts(counts);
      setErrorMsg("");
    } catch (err) {
      console.error("Fetch error:", err);
      setErrorMsg("Error fetching orders. Please try again later.");
    } finally {
      setLoading(false);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 160);
    }
  }

  // update content max-heights for animation
  useLayoutEffect(() => {
    function updateHeights() {
      Object.entries(contentRefs.current).forEach(([id, el]) => {
        if (!el) return;
        el.style.maxHeight = (openOrderId === id) ? `${el.scrollHeight}px` : "0px";
      });
    }
    updateHeights();
    window.addEventListener("resize", updateHeights);
    return () => window.removeEventListener("resize", updateHeights);
  }, [openOrderId, orders]);

  const handleToggle = (orderId) => setOpenOrderId(prev => prev === orderId ? null : orderId);
  const handleClear = () => { setMobile(""); sessionStorage.removeItem("savedMobile"); setOrders([]); setErrorMsg(""); setStatusCounts({}); setOpenOrderId(null); };

  const filters = useMemo(() => {
    const base = [{ key: "all", label: `All (${orders.length})` }];
    const orderKeys = ["opened", "working", "in-progress", "out-for-delivery", "delivered", "cancelled", "returned", "other"];
    orderKeys.forEach(k => { if (statusCounts[k]) base.push({ key: k, label: `${STATUS_STYLES[k]?.label || k} (${statusCounts[k]})` }); });
    Object.keys(statusCounts).forEach(k => { if (!orderKeys.includes(k)) base.push({ key: k, label: `${STATUS_STYLES[k]?.label || k} (${statusCounts[k]})` }); });
    return base;
  }, [statusCounts, orders.length]);

  const filteredOrders = useMemo(() => activeFilter === "all" ? orders : orders.filter((o) => o._statusKey === activeFilter), [orders, activeFilter]);

  return (
    <div className="myorders-root">
      <div className="search-container">
        <div className={`search-bar ${loading ? "loading" : ""}`} role="search" aria-label="Search orders by mobile">
          <input inputMode="numeric" pattern="[0-9]*" aria-label="Mobile number" maxLength={10}
                 placeholder="Enter 10-digit mobile number" value={mobile} onChange={handleMobileChange}
                 onKeyDown={(e) => e.key === "Enter" && searchOrders()} />
          {mobile && <button className="clear-btn" aria-label="Clear mobile" onClick={handleClear}><i className="fa-solid fa-xmark" /></button>}
          <button className={`search-btn ${loading ? "is-loading" : ""}`} onClick={() => searchOrders()} disabled={loading} aria-label="Search orders" title="Search">
            {!loading ? <FaSearchengin /> : <span className="btn-spinner" aria-hidden />}
          </button>
        </div>
        {errorMsg && <div className="error-msg" role="alert" aria-live="polite"><i className="fa-solid fa-circle-exclamation" /> <span>{errorMsg}</span></div>}
      </div>

      {orders.length > 0 && (
        <div className="filter-bar" ref={resultRef} role="toolbar" aria-label="Filter orders by status">
          {filters.map((f) => <button key={f.key} className={`filter-tag ${f.key} ${activeFilter === f.key ? "active" : ""}`} onClick={() => setActiveFilter(f.key)} aria-pressed={activeFilter === f.key} title={f.label}>{f.label}</button>)}
        </div>
      )}

      <div className="order-list">
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="accordion-placeholder">
            <div className="placeholder-header" />
            <div className="placeholder-body">
              <div className="placeholder-line short" />
              <div className="placeholder-line" />
              <div className="placeholder-line" />
            </div>
          </div>
        ))}

        {!loading && orders.length === 0 && (
          <div className="empty-card" role="status"><i className="fa-regular fa-folder-open" /> <div>No orders to show. Search with a 10-digit number.</div></div>
        )}

        {!loading && filteredOrders.map((order, idx) => {
          const id = String(order["Order ID"] || order.OrderID || order.Timestamp || idx);
          const styleInfo = STATUS_STYLES[order._statusKey] ?? STATUS_STYLES.other;
          const totalNum = parseFloat(String(order["Total Price"] || "").replace(/[^\d.]/g, "")) || 0;
          const isOpen = openOrderId === id;

          return (
            <div key={id} className={`accordion-item ${isOpen ? "expanded" : ""}`}>
              <button
                className="accordion-header"
                onClick={() => handleToggle(id)}
                aria-expanded={isOpen}
                aria-controls={`content-${id}`}
                id={`hdr-${id}`} // remove status color, use transparent/default
              >
                <div className="hdr-left">
                  <div className="hdr-title">Order {id}</div>
                  <div className="hdr-time">{formatDate(order?.Timestamp)}</div>
                </div>

                <div className="hdr-right">
                  <div className="hdr-status" style={{ borderColor: styleInfo.color }}>{styleInfo.label}</div>
                  <div className={`hdr-chevron ${isOpen ? "rotated" : ""}`} aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </button>

              <div id={`content-${id}`} className="accordion-content" role="region" aria-labelledby={`hdr-${id}`}
                   ref={(el) => { contentRefs.current[id] = el; }} style={{ maxHeight: isOpen && contentRefs.current[id] ? `${contentRefs.current[id].scrollHeight}px` : "0px" }}>
                <div className="card-body">
                  <div className="card-accent" aria-hidden style={{ background: `linear-gradient(180deg, var(--primary), ${styleInfo.color}66)` }} />

                  <div className="order-items">
                    <ul className="items-list" aria-label="Order items">
                      {order.items.map((item, i) => (
                        <li key={i} className="item-row">
                          <div className="item-left">
                            <div className="item-title">{item.brand ? `${item.brand} - ` : ''}{item.name}{item.unit ? ` (${item.unit})` : ''}</div>
                            <div className="item-meta">Qty: {item.qty} • ₹{(item.unitPrice || 0).toLocaleString()}</div>
                          </div>
                          <div className="item-right">₹{(item.subtotal || 0).toLocaleString()}</div>
                        </li>
                      ))}
                    </ul>

                    <div className="total-row">
                      <div className="total-label">Total:</div>
                      <div className="total-value">₹{totalNum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                    </div>
                  </div>

                  <div className="order-customer">
                    <div className="name">{order?.["Customer Name"] || "Customer"}</div>
                    <div className="address">{order?.["Delivery Address"] ? shorten(order["Delivery Address"], 220) : "Address not provided"}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

MyOrders.propTypes = {
  apiUrl: PropTypes.string,
};