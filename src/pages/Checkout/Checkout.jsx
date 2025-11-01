// src/pages/Checkout/Checkout.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaMapMarkerAlt, FaChevronLeft, FaChevronRight, FaTrash, FaCheck } from "react-icons/fa";
import { VITE_Checkout_API } from "../../API";
import "./Checkout.css";
import "./CheckoutSuccess.css";
import { CommonIcons } from "../../../App.config";

const scriptURL = VITE_Checkout_API;

/* ---------- helpers ---------- */
function setCookie(name, value, days = 1) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/`;
  } catch (err) {
    console.warn("setCookie error:", err);
  }
}
function getCookie(name) {
  try {
    const k = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(k) === 0) return decodeURIComponent(c.substring(k.length));
    }
  } catch (err) {
    console.warn("getCookie error:", err);
  }
  return null;
}
function deleteCookie(name) {
  try {
    document.cookie = `${name}=; Max-Age=0; path=/`;
  } catch (err) {
    console.warn("deleteCookie error:", err);
  }
}
function generateOrderID() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 10 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}
function currency(n) {
  const v = parseFloat(n || 0) || 0;
  // show as ₹x.yy
  return `₹${v.toFixed(2)}`;
}
function buildImageUrl(src) {
  try {
    if (!src) return "";
    const s = String(src).trim();
    if (/^data:|^https?:\/\//i.test(s)) return s;
    const driveIdMatch = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (driveIdMatch && driveIdMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveIdMatch[1])}`;
    }
    const openIdMatch = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (openIdMatch && openIdMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(openIdMatch[1])}`;
    }
    if (/^[a-zA-Z0-9_-]{10,}$/.test(s)) {
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(s)}`;
    }
    return encodeURI(s);
  } catch (err) {
    console.warn("buildImageUrl error:", err);
    return "";
  }
}

/* ---------- component ---------- */
export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialCart = useMemo(() => {
    // priority: location.state.cart -> sessionStorage.cart -> cookie
    try {
      const s = location?.state?.cart;
      if (Array.isArray(s) && s.length) return s;
    } catch {}
    try {
      const ss = JSON.parse(sessionStorage.getItem("cart") || "[]");
      if (Array.isArray(ss) && ss.length) return ss;
    } catch {}
    try {
      const cookie = getCookie("rice_cart");
      if (cookie) {
        const parsed = JSON.parse(cookie);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {}
    return [];
  }, [location]);

  const [cart, setCart] = useState(initialCart);
  const [orderId] = useState(generateOrderID());
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState(() => {
    try {
      const saved = getCookie("rice_customer");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { name: "", mobile: "", address: "", terms: false };
  });

  const [errors, setErrors] = useState({});
  const [locationCaptured, setLocationCaptured] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  /* computed totals */
  const total = useMemo(() => cart.reduce((s, it) => s + (Number(it.offer_price ?? it.price ?? 0) * (it.qty ?? 0)), 0), [cart]);
  const originalTotal = useMemo(() => cart.reduce((s, it) => s + (Number(it.price ?? it.offer_price ?? 0) * (it.qty ?? 0)), 0), [cart]);
  const totalSaved = useMemo(() => Math.max(0, originalTotal - total), [originalTotal, total]);
  const percentSaved = useMemo(() => (originalTotal > 0 ? (totalSaved / originalTotal) * 100 : 0), [originalTotal, totalSaved]);

  /* persist cart -> session & cookie */
  useEffect(() => {
    try {
      sessionStorage.setItem("cart", JSON.stringify(cart));
      setCookie("rice_cart", JSON.stringify(cart), 1);
    } catch (err) {
      console.warn("persist cart failed", err);
    }
  }, [cart]);

  /* if cart gets empty, redirect to home (keeps current behavior) */
  useEffect(() => {
    if (!cart || cart.length === 0) navigate("/", { replace: true });
  }, [cart, navigate]);

  /* persist customer */
  useEffect(() => {
    try { setCookie("rice_customer", JSON.stringify(customer), 1); } catch (err) { console.warn(err); }
  }, [customer]);

  /* quantity / remove */
  const updateQty = useCallback((idx, delta) => {
    setCart(prev => {
      const copy = [...prev];
      const current = copy[idx]?.qty ?? 0;
      copy[idx] = { ...copy[idx], qty: Math.max(0, current + delta) };
      return copy.filter(it => (it.qty ?? 0) > 0);
    });
  }, []);

  const removeItem = useCallback((idx) => {
    setCart(prev => {
      const copy = [...prev];
      copy.splice(idx, 1);
      return copy;
    });
  }, []);

  /* --- Location capture with good UX and error handling --- */
  const captureLocation = useCallback(() => {
    setErrors(prev => ({ ...prev, location: undefined }));
    if (!navigator.geolocation) {
      setErrors(prev => ({ ...prev, location: "Geolocation not supported by your browser." }));
      return;
    }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        try {
          const { latitude: lat, longitude: lon } = coords;
          setLatitude(String(lat));
          setLongitude(String(lon));
          setMapsUrl(`https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lon)}`);
          setLocationCaptured(true);
          setErrors(prev => ({ ...prev, location: undefined }));
        } catch (err) {
          console.warn("process coords", err);
          setErrors(prev => ({ ...prev, location: "Unable to process captured location." }));
          setLocationCaptured(false);
        } finally {
          setLoadingLocation(false);
        }
      },
      (err) => {
        setLoadingLocation(false);
        setLocationCaptured(false);
        if (err?.code === err.PERMISSION_DENIED) setErrors(prev => ({ ...prev, location: "Location permission denied." }));
        else if (err?.code === err.POSITION_UNAVAILABLE) setErrors(prev => ({ ...prev, location: "Location unavailable." }));
        else setErrors(prev => ({ ...prev, location: "Unable to capture location." }));
      },
      { timeout: 12000, maximumAge: 30_000 }
    );
  }, []);

  /* validation for step 2 (customer details) */
  const validateStep2 = useCallback(() => {
    const e = {};
    if (!customer.name || !customer.name.trim()) e.name = "Please enter your name.";
    if (!/^\d{10}$/.test(String(customer.mobile || ""))) e.mobile = "Enter a valid 10-digit mobile number.";
    if (!customer.address || !customer.address.trim()) e.address = "Please provide delivery address.";
    if (!customer.terms) e.terms = "You must agree to the terms & conditions.";
    if (!locationCaptured) e.location = "Please capture your delivery location.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [customer, locationCaptured]);

  /* Validate final step before placing order */
  const canPlaceOrder = useMemo(() => {
    // quick checks: cart exists, step2 valid
    if (!cart || cart.length === 0) return false;
    if (!customer.name || !/^\d{10}$/.test(String(customer.mobile || "")) || !customer.address || !customer.terms) return false;
    if (!locationCaptured) return false;
    return true;
  }, [cart, customer, locationCaptured]);

  /* submit order */
  const submitOrder = useCallback(async () => {
    if (submitting) return;
    setSubmitError("");
    setErrors({});
    if (!cart || cart.length === 0) return;
    // run final validation
    if (!validateStep2()) {
      setStep(2);
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("orderId", orderId);
      formData.append("name", customer.name);
      formData.append("mobile", customer.mobile);
      formData.append("address", customer.address);
      formData.append("terms", customer.terms ? "Yes" : "No");
      formData.append("latitude", String(latitude || ""));
      formData.append("longitude", String(longitude || ""));
      formData.append("mapsUrl", mapsUrl || "");
      formData.append("totalPrice", total.toFixed(2));
      formData.append("items", JSON.stringify(cart.map(it => ({
        id: it.id ?? it.sku ?? null,
        title: it.title,
        brand: it.brand ?? "",
        qty: it.qty ?? 0,
        unitPrice: Number(it.offer_price ?? it.price ?? 0),
        weight: it.weight ?? it.unit ?? ""
      }))));

      const res = await fetch(scriptURL, { method: "POST", body: formData });

      if (!res.ok) {
        let txt = "";
        try { txt = await res.text(); } catch {}
        try {
          const j = txt ? JSON.parse(txt) : null;
          throw new Error(j?.error || `Submission failed (${res.status})`);
        } catch {
          throw new Error(`Submission failed (${res.status})`);
        }
      }

      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }

      const returnedOrderId = (data && (data.orderId || data.order_id)) || orderId;

      // Persist saved mobile (so MyOrders can auto-load) and lastOrderId for refresh safety
      try {
        if (customer.mobile) sessionStorage.setItem("savedMobile", String(customer.mobile));
        window.localStorage.setItem("lastOrderId", returnedOrderId);
      } catch (err) { console.warn("persist order/mobile", err); }

      // Clear persisted cart & customer so future visits start clean
      try {
        deleteCookie("rice_cart");
        deleteCookie("rice_customer");
        sessionStorage.removeItem("cart");
      } catch (err) { console.warn("clear storage failed", err); }

      // Navigate to success page with order id in state.
      // IMPORTANT: we do NOT call setCart([]) here (that would trigger the checkout's empty-cart redirect).
      navigate("/success", { state: { orderId: returnedOrderId } });
      return;
    } catch (err) {
      console.error("Order submit error:", err);
      setSubmitError(err?.message || "Order failed. Please try again.");
      setErrors(prev => ({ ...prev, submit: err?.message || "Submission failed" }));
    } finally {
      setSubmitting(false);
    }
  }, [submitting, cart, customer, latitude, longitude, mapsUrl, total, orderId, validateStep2, navigate]);

  if (!cart || cart.length === 0) return null;

  const steps = [1, 2, 3];

  return (
    <div className="checkout-page">
      <div className="checkout-container" role="main" aria-labelledby="checkout-heading">
        <header className="checkout-header">
          <h1 id="checkout-heading">Checkout</h1>

          <div className="checkout-stepper" aria-hidden="true">
            {steps.map((s, i) => (
              <React.Fragment key={s}>
                <div className={`step ${step === s ? "active" : step > s ? "completed" : ""}`} aria-current={step === s ? "step" : undefined}>
                  {s}
                </div>
                {i < steps.length - 1 && <div className={`connector ${step > s ? "active" : ""}`} />}
              </React.Fragment>
            ))}
            <div className="step-labels">
              <span>Review</span>
              <span>Details</span>
              <span>Confirm</span>
            </div>
          </div>
        </header>

        <main className="checkout-main">
          {/* ---------- Step 1: Review cart ---------- */}
          {step === 1 && (
            <section className="step-panel panel-1" aria-labelledby="review-heading">
              <h2 id="review-heading">1. Review your cart</h2>
              <div className="cart-list">
                {cart.map((item, idx) => {
                  const candidate = (item.images && Array.isArray(item.images) && item.images[0]) || item.image || item.thumbnail || "";
                  const thumb = buildImageUrl(candidate);
                  const unitOrig = Number(item.price ?? item.offer_price ?? 0);
                  const unitOffer = Number(item.offer_price ?? item.price ?? 0);
                  const qty = Number(item.qty ?? 0);
                  const lineOrigTotal = unitOrig * qty;
                  const lineOfferTotal = unitOffer * qty;
                  const lineSaved = Math.max(0, lineOrigTotal - lineOfferTotal);
                  const linePercent = unitOrig > 0 ? Math.round(((unitOrig - unitOffer) / unitOrig) * 100) : 0;

                  return (
                    <div className="cart-row" key={`${item.id ?? item.title}-${idx}`}>
                      <div className="cart-row-left">
                        <div className="cart-thumb-img-wrapper">
                          {thumb ? <img src={thumb} alt={item.title} className="cart-thumb" /> : <div className="cart-thumb" aria-hidden />}
                        </div>
                        <div>
                          <div className="cart-title">{item.title}</div>
                          <div className="cart-sub">{item.brand ? `${item.brand} • ${item.weight ?? ""}` : item.weight ?? ""}</div>
                          <div className="cart-pricing-row">
                            {Number(item.offer_price) && Number(item.price) && Number(item.price) > Number(item.offer_price) ? (
                              <>
                                <span className="orig-price" aria-hidden>{currency(unitOrig)}</span>
                                <span className="offer-price">{currency(unitOffer)}</span>
                                <span className="saving-badge" aria-hidden>{linePercent > 0 ? `${linePercent}% off` : "Save"}</span>
                              </>
                            ) : (
                              <span className="offer-price">{currency(unitOffer)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="cart-row-right">
                        <div className="qty-controls" aria-label={`Quantity controls for ${item.title}`}>
                          <button type="button" className="qty-btn" onClick={() => updateQty(idx, -1)} aria-label={`Decrease ${item.title}`}>−</button>
                          <span className="qty-display" aria-live="polite">{item.qty ?? 0}</span>
                          <button type="button" className="qty-btn" onClick={() => updateQty(idx, +1)} aria-label={`Increase ${item.title}`}>+</button>
                        </div>

                        <div className="row-price">{currency(lineOfferTotal)}</div>
                        {lineSaved > 0 && <div className="line-saved" aria-hidden>Saved {currency(lineSaved)}</div>}

                        <button type="button" className="remove-icon" onClick={() => removeItem(idx)} aria-label="Remove item"><FaTrash /></button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="summary">
                <div className="summary-row"><span>Original total</span><span>{currency(originalTotal)}</span></div>
                <div className="summary-row discount"><span>Discounted total</span><strong>{currency(total)}</strong></div>
                <div className="summary-row summary-saved">
                  <span>You saved</span>
                  <strong>{currency(totalSaved)}</strong>
                  <span className="summary-saved-percent">({originalTotal > 0 ? `${percentSaved.toFixed(1)}%` : `0%`})</span>
                </div>

                <div className="summary-actions">
                  <button type="button" className="btn" onClick={() => navigate(-1)}><FaChevronLeft /> Back to shopping</button>
                  <button type="button" className="btn primary" onClick={() => setStep(2)}>Proceed to details <FaChevronRight /></button>
                </div>
              </div>
            </section>
          )}

          {/* ---------- Step 2: Customer Details ---------- */}
          {step === 2 && (
            <section className="step-panel panel-2" aria-labelledby="details-heading">
              <h2 id="details-heading">2. Customer details</h2>
              <form
                className="customer-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (validateStep2()) setStep(3);
                }}
                noValidate
              >
                <label>
                  Full name
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => setCustomer(c => ({ ...c, name: e.target.value }))}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "err-name" : undefined}
                  />
                  {errors.name && <div id="err-name" className="field-error">{errors.name}</div>}
                </label>

                <label>
                  Mobile number
                  <input
                    type="tel"
                    value={customer.mobile}
                    inputMode="numeric"
                    onChange={(e) => setCustomer(c => ({ ...c, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    aria-invalid={!!errors.mobile}
                    aria-describedby={errors.mobile ? "err-mobile" : undefined}
                    maxLength={10}
                  />
                  {errors.mobile && <div id="err-mobile" className="field-error">{errors.mobile}</div>}
                </label>

                <label>
                  Delivery address
                  <textarea
                    value={customer.address}
                    onChange={(e) => setCustomer(c => ({ ...c, address: e.target.value }))}
                    rows={4}
                    aria-invalid={!!errors.address}
                    aria-describedby={errors.address ? "err-address" : undefined}
                  />
                  {errors.address && <div id="err-address" className="field-error">{errors.address}</div>}
                </label>

                <div className="location-row">
                  {/* show capture button only when location not captured */}
                  {!locationCaptured ? (
                    <button
                      type="button"
                      className={`btn location-btn ${loadingLocation ? "loading" : ""}`}
                      onClick={captureLocation}
                      disabled={loadingLocation}
                      aria-live="polite"
                      aria-disabled={loadingLocation}
                      title="Capture your current location"
                    >
                      <FaMapMarkerAlt />
                      {loadingLocation ? "Capturing…" : "Capture location"}
                    </button>
                  ) : (
                    <div className="location-captured-group" aria-live="polite">
                      <button type="button" className="btn location-captured" disabled aria-disabled="true">
                        <FaCheck /> Location captured
                      </button>
                    </div>
                  )}

                  {mapsUrl && (
                    <a href={mapsUrl} rel="noopener noreferrer" target="_blank" className="view-map">View on map</a>
                  )}
                </div>
                {errors.location && <div className="field-error">{errors.location}</div>}

                <label className="terms-row">
                  <input
                    type="checkbox"
                    checked={customer.terms}
                    onChange={(e) => setCustomer(c => ({ ...c, terms: e.target.checked }))}
                    aria-invalid={!!errors.terms}
                  /> I agree to the terms &amp; conditions
                </label>
                {errors.terms && <div className="field-error">{errors.terms}</div>}

                <div className="form-actions panel-2-actions">
                  <button type="button" className="btn" onClick={() => setStep(1)}><FaChevronLeft /> Back</button>
                  <button type="submit" className="btn primary">Next <FaChevronRight /></button>
                </div>
              </form>
            </section>
          )}

          {/* ---------- Step 3: Confirm & Place Order ---------- */}
          {step === 3 && (
            <section className="step-panel panel-3" aria-labelledby="confirm-heading">
              <h2 id="confirm-heading">3. Review &amp; confirm</h2>

              <div className="confirm-summary">
                <div className="confirm-items">
                  {cart.map((it, idx) => (
                    <div key={`${it.id ?? it.title}-${idx}`} className="confirm-row">
                      <div>
                        <div className="confirm-title">{it.title}</div>
                        <div className="confirm-meta">{it.qty} × {currency(Number(it.offer_price ?? it.price ?? 0))} {it.brand ? `• ${it.brand}` : ""}</div>
                      </div>
                      <div className="confirm-right">{currency(Number(it.qty ?? 0) * Number(it.offer_price ?? it.price ?? 0))}</div>
                    </div>
                  ))}
                </div>

                <div className="confirm-totals">
                  <div className="confirm-line"><span>Original total</span><span>{currency(originalTotal)}</span></div>
                  <div className="confirm-line"><span>Total</span><strong>{currency(total)}</strong></div>
                  <div className="confirm-line"><span>You saved</span><strong>{currency(totalSaved)}</strong><span> ({originalTotal > 0 ? `${percentSaved.toFixed(1)}%` : `0%`})</span></div>
                </div>

                <div className="confirm-customer">
                  <h3>Deliver to</h3>
                  <div>{customer.name}</div>
                  <div>{customer.mobile}</div>
                  <div>{customer.address}</div>
                  {mapsUrl && <div><a href={mapsUrl} target="_blank" rel="noopener noreferrer">View delivery location</a></div>}
                </div>

                {submitError && <div className="submit-error" role="alert">{submitError}</div>}

                <div className="confirm-actions">
                  <button type="button" className="btn" onClick={() => setStep(2)}><FaChevronLeft /> Back</button>

                  <button
                    type="button"
                    className="btn primary place-order-btn"
                    onClick={submitOrder}
                    disabled={submitting || !canPlaceOrder}
                    aria-disabled={submitting || !canPlaceOrder}
                    aria-live="polite"
                  >
                    {submitting ? (<><span className="spinner" aria-hidden /> Placing order...</>) : "Place Order"}
                  </button>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
