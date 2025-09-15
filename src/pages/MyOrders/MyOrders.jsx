// MyOrders.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./MyOrders.css";
import { VITE_ORDERS_API } from "../../API";

/* Canonical status styles */
const STATUS_STYLES = {
  opened: { label: "Opened", color: "#06b6d4" }, // teal
  "in-progress": { label: "In Progress", color: "#f59e0b" }, // amber
  "out-for-delivery": { label: "Out for Delivery", color: "#0891b2" }, // cyan
  delivered: { label: "Delivered", color: "#10b981" }, // green
  cancelled: { label: "Cancelled", color: "#ef4444" }, // red
  returned: { label: "Returned", color: "#7c3aed" }, // purple
  other: { label: "Other", color: "#64748b" }, // slate
};

/* Helpers */
function formatDate(utcDate) {
  if (!utcDate || utcDate === "N/A") return "N/A";
  try {
    return new Date(utcDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return utcDate;
  }
}

function shorten(text = "", max = 80) {
  if (!text) return "";
  return text.length <= max ? text : text.slice(0, max).trim() + "...";
}

function normalizeStatus(rawStatus) {
  if (!rawStatus) return "other";
  const s = rawStatus.toString().trim().toLowerCase();
  if (s === "opened" || s === "open") return "opened";
  if (s.includes("progress") || s === "processing" || s === "inprogress") return "in-progress";
  if ((s.includes("out") && s.includes("delivery")) || s.includes("out for delivery") || s.includes("out-for-delivery")) return "out-for-delivery";
  if (s === "delivered" || s === "completed") return "delivered";
  if (s === "cancelled" || s === "canceled" || s === "cancel") return "cancelled";
  if (s === "returned" || s === "return") return "returned";
  return "other";
}

export default function MyOrders() {
  const [mobile, setMobile] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [statusCounts, setStatusCounts] = useState({});
  const resultRef = useRef(null);

  /* Load saved mobile on mount */
  useEffect(() => {
    const saved = localStorage.getItem("savedMobile");
    if (saved) {
      setMobile(saved);
      searchOrders(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* sanitize input to digits only and max 10 */
  const sanitizeMobileInput = (value) => value.replace(/\D/g, "").slice(0, 10);
  const handleMobileChange = (e) => {
    setMobile(sanitizeMobileInput(e.target.value));
    setErrorMsg("");
  };

  const validateMobile = (m) => /^\d{10}$/.test(m);

  async function searchOrders(overrideMobile) {
    const m = (overrideMobile ?? mobile).trim();
    setErrorMsg("");
    setOrders([]);
    setActiveFilter("all");
    setStatusCounts({});
    if (!validateMobile(m)) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }
    localStorage.setItem("savedMobile", m);
    setLoading(true);

    try {
        const resp = await fetch(`${VITE_ORDERS_API}?mobile=${m}`);
      const data = await resp.json();

      if (data.success && Array.isArray(data.orders)) {
        const normalized = data.orders.map((o) => {
          const key = normalizeStatus(o["Orders"]);
          return { ...o, _statusKey: key };
        });
        setOrders(normalized);

        const counts = {};
        normalized.forEach((o) => {
          const k = o._statusKey || "other";
          counts[k] = (counts[k] || 0) + 1;
        });
        setStatusCounts(counts);
        setErrorMsg("");
      } else {
        setErrorMsg(data.message || "No orders found for this number.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setErrorMsg("Error fetching orders. Please try again later.");
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (resultRef.current) resultRef.current.scrollIntoView({ behavior: "smooth" });
      }, 220);
    }
  }

  const filters = useMemo(() => {
    const base = [{ key: "all", label: `All (${orders.length})` }];
    Object.keys(statusCounts).forEach((k) => {
      const info = STATUS_STYLES[k] ?? STATUS_STYLES.other;
      base.push({ key: k, label: `${info.label} (${statusCounts[k]})`, color: info.color });
    });
    return base;
  }, [statusCounts, orders.length]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === "all") return orders;
    return orders.filter((o) => o._statusKey === activeFilter);
  }, [orders, activeFilter]);

  /* PDF export using html2pdf (global) */
  const handleDownload = async (orderIndex) => {
    const order = orders[orderIndex];
    if (!order) {
      alert("Order not found.");
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.style.background = "#fff";
    wrapper.style.color = "#000";
    wrapper.style.fontFamily = "Arial, sans-serif";
    wrapper.style.padding = "22px";
    wrapper.style.maxWidth = "800px";
    wrapper.innerHTML = `
      <div style="text-align:center; margin-bottom:14px;">
        <img src="https://i.imgur.com/1aVb2qE.png" alt="Logo" style="height:48px; display:block; margin:0 auto 6px;" />
        <h2 style="margin:0; font-size:18px;">Sri Lakshmi Rice Distributors</h2>
        <div>Hyderabad, Telangana</div>
        <hr style="margin:12px 0;" />
      </div>
      <div>
        <p><strong>Ordered On:</strong> ${formatDate(order["timestamp"])}</p>
        <p><strong>Name:</strong> ${order["Name"] || "N/A"}</p>
        <p><strong>Rice Brand:</strong> ${order["Brand"] || "N/A"}</p>
        <p><strong>Weight Per Bag:</strong> ${order["Weight per Bag"] || "N/A"}</p>
        <p><strong>Total Bags:</strong> ${order["Bags"] || "N/A"}</p>
        <p><strong>Total Price:</strong> ${order["Total Price"] || "N/A"}</p>
        <p><strong>Address:</strong> ${order["Address"] || "N/A"}</p>
        <p><strong>Status:</strong> ${order["Orders"] || "N/A"}</p>
      </div>
      <hr style="margin:14px 0;" />
      <div style="text-align:center; font-size:13px;">Thank you for ordering from srilakshmirice.com</div>
    `;

    wrapper.style.position = "absolute";
    wrapper.style.left = "-9999px";
    document.body.appendChild(wrapper);

    try {
      // eslint-disable-next-line no-undef
      await html2pdf()
        .set({
          margin: 0.5,
          filename: `order-${orderIndex + 1}-details.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        })
        .from(wrapper)
        .save();
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Try again.");
    } finally {
      document.body.removeChild(wrapper);
    }
  };

  const handleClear = () => {
    setMobile("");
    localStorage.removeItem("savedMobile");
    setOrders([]);
    setErrorMsg("");
    setStatusCounts({});
  };

  return (
    <div className="myorders-root">
      {/* Search */}
      <div className="search-container">
        <div className="search-bar" role="search">
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="Mobile number"
            maxLength={10}
            placeholder="Enter 10-digit mobile number"
            value={mobile}
            onChange={handleMobileChange}
            onKeyDown={(e) => { if (e.key === "Enter") searchOrders(); }}
          />
          {mobile && (
            <button className="clear-btn" aria-label="Clear mobile" onClick={handleClear}>
              <i className="fa-solid fa-xmark" />
            </button>
          )}
          <button
            className="search-btn"
            onClick={() => searchOrders()}
            disabled={loading}
            aria-label="Search orders"
            title="Search"
          >
            {loading ? <span className="loader" aria-hidden /> : <i className="fa-solid fa-magnifying-glass" />}
          </button>
        </div>

        {errorMsg && <div className="error-msg" role="alert"><i className="fa-solid fa-circle-exclamation" /> {errorMsg}</div>}
      </div>

      {/* Filters */}
      {orders.length > 0 && (
        <div className="filter-bar" ref={resultRef}>
          {filters.map((f) => (
              <button
                key={f.key}
                className={`filter-tag ${f.key} ${activeFilter === f.key ? "active" : ""}`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
        </div>
      )}

      {/* Results */}
      <div className="order-list">
        {loading && (
          <div className="loading-card">
            <div className="loading-dot" />
            <div className="loading-dot" />
            <div className="loading-dot" />
            <div>Fetching orders...</div>
          </div>
        )}

        {loading && Array.from({ length: 4 }).map((_, i) => (
          <article key={i} className="order-card skeleton-card">
            <div className="order-top">
              <div>
                <h4 className="skeleton skeleton-text medium" />
                <div className="order-date skeleton skeleton-text short" />
              </div>
              <div className="status-badge skeleton skeleton-text short" />
            </div>

            <div className="order-main">
              <div className="brand skeleton skeleton-text medium" />
              <div className="price skeleton skeleton-text short" />
            </div>

            <div className="order-meta skeleton skeleton-text long" />

            <div className="order-customer">
              <div className="name skeleton skeleton-text medium" />
              <div className="address skeleton skeleton-text long" />
            </div>

            <div className="order-actions">
              <button className="download-btn skeleton skeleton-text medium" />
            </div>
          </article>
        ))}

        {!loading && orders.length === 0 && (
          <div className="empty-card">
            <i className="fa-regular fa-folder-open" /> <div>No orders to show. Search with a 10-digit number.</div>
          </div>
        )}

        {!loading && filteredOrders.map((order, idx) => {
          const globalIndex = orders.indexOf(order);
          const styleInfo = STATUS_STYLES[order._statusKey] || STATUS_STYLES.other;

          return (
            <article
              key={`${globalIndex}-${order.timestamp || idx}`}
              className={`order-card ${order._statusKey}`}
            >
              <div className="order-top">
                <div>
                  <h4>Order {globalIndex + 1}</h4>
                  <div className="order-date">{formatDate(order["timestamp"])}</div>
                </div>
                <div className={`status-badge ${order._statusKey}`}>
                  {styleInfo.label}
                </div>
              </div>

              <div className="order-main">
                <div className="brand">{order["Brand"] || "—"}</div>
                <div className="price">₹ {order["Total Price"] ?? "—"}</div>
              </div>

              <div className="order-meta">
                <span>{order["Weight per Bag"] || "—"}</span>
                <span>•</span>
                <span>{order["Bags"] || "—"} bag(s)</span>
              </div>

              <div className="order-customer">
                <div className="name">{order["Name"] || "Customer"}</div>
                <div className="address">{order["Address"] ? shorten(order["Address"], 96) : "Address not provided"}</div>
              </div>

              <div className="order-actions">
                <button className="download-btn" onClick={() => handleDownload(globalIndex)} title="Download PDF">
                  <i className="fa-solid fa-file-arrow-down" /> <span>PDF</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}