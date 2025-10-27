import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaMapMarkerAlt, FaChevronLeft, FaChevronRight, FaTrash } from "react-icons/fa";
import { VITE_Checkout_API } from "../../API";
import "./Checkout.css";
import "./CheckoutSuccess.css";

const scriptURL = VITE_Checkout_API;

// helpers (cookies, id, currency, buildImageUrl) --- same as you had
function setCookie(name, value, days = 1) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = "expires=" + d.toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/`;
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
  return Array.from({ length: 10 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}
function currency(n) {
  const v = parseFloat(n || 0) || 0;
  return `₹${v.toFixed(2)}`;
}
function buildImageUrl(src) {
  try {
    if (!src) return "";
    const s = String(src).trim();
    if (/^data:|^https?:\/\//i.test(s)) return s;
    const driveIdMatch = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (driveIdMatch && driveIdMatch[1]) {
      const id = driveIdMatch[1];
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
    }
    const openIdMatch = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (openIdMatch && openIdMatch[1]) {
      const id = openIdMatch[1];
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
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

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialCart = useMemo(() => {
    try {
      const s = location?.state?.cart;
      if (Array.isArray(s) && s.length > 0) return s;
    } catch (err) {
      console.warn("reading cart from location.state failed:", err);
    }
    try {
      const ss = JSON.parse(sessionStorage.getItem("cart") || "[]");
      if (Array.isArray(ss) && ss.length > 0) return ss;
    } catch (err) {
      console.warn("parsing cart from sessionStorage failed:", err);
    }
    try {
      const cookie = getCookie("rice_cart");
      if (cookie) {
        const parsed = JSON.parse(cookie);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.warn("parsing cart from cookie failed:", err);
    }
    return [];
  }, [location]);

  const [cart, setCart] = useState(initialCart);
  const [orderId] = useState(generateOrderID());
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState(() => {
    try {
      const saved = getCookie("rice_customer");
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.warn("reading saved customer failed:", err);
    }
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

  const total = useMemo(() =>
      cart.reduce((s, i) => s + (Number(i.offer_price ?? i.price ?? 0) * (i.qty ?? 0)), 0),
    [cart]
  );

  const originalTotal = useMemo(() =>
    cart.reduce((s, i) => {
      const origUnit = Number(i.price ?? i.offer_price ?? 0);
      const qty = Number(i.qty ?? 0);
      return s + origUnit * qty;
    }, 0),
    [cart]
  );

  const totalSaved = useMemo(() => Math.max(0, originalTotal - total), [originalTotal, total]);
  const percentSaved = useMemo(() => (originalTotal > 0 ? (totalSaved / originalTotal) * 100 : 0), [originalTotal, totalSaved]);

  useEffect(() => {
    try {
      sessionStorage.setItem("cart", JSON.stringify(cart));
      setCookie("rice_cart", JSON.stringify(cart), 1);
    } catch (err) {
      console.warn("persisting cart failed:", err);
    }
  }, [cart]);

  useEffect(() => {
    if (!cart || cart.length === 0) {
      navigate("/", { replace: true });
    }
  }, [cart, navigate]);

  useEffect(() => {
    try {
      setCookie("rice_customer", JSON.stringify(customer), 1);
    } catch (err) {
      console.warn("persisting customer failed:", err);
    }
  }, [customer]);

  const updateQty = useCallback((idx, delta) => {
    setCart((prev) => {
      const copy = [...prev];
      const currentQty = copy[idx]?.qty ?? 0;
      copy[idx] = { ...copy[idx], qty: Math.max(0, currentQty + delta) };
      return copy.filter((it) => (it.qty ?? 0) > 0);
    });
  }, []);

  const removeItem = useCallback((idx) => {
    setCart((prev) => {
      const copy = [...prev];
      copy.splice(idx, 1);
      return copy;
    });
  }, []);

  const captureLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrors((p) => ({ ...p, location: "Geolocation not supported" }));
      return;
    }
    setLoadingLocation(true);
    setErrors((p) => ({ ...p, location: undefined }));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        try {
          const { latitude: lat, longitude: lon } = coords;
          setLatitude(lat);
          setLongitude(lon);
          setMapsUrl(`https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lon)}`);
          setLocationCaptured(true);
        } catch (err) {
          console.warn("processing coords error:", err);
          setErrors((p) => ({ ...p, location: "Unable to capture location" }));
          setLocationCaptured(false);
        } finally {
          setLoadingLocation(false);
        }
      },
      (err) => {
        setLoadingLocation(false);
        setLocationCaptured(false);
        if (err && err.code === err.PERMISSION_DENIED) {
          setErrors((p) => ({ ...p, location: "Location permission denied" }));
        } else if (err && err.code === err.POSITION_UNAVAILABLE) {
          setErrors((p) => ({ ...p, location: "Location unavailable" }));
        } else {
          setErrors((p) => ({ ...p, location: "Unable to capture location" }));
        }
      },
      { timeout: 10000 }
    );
  }, []);

  const validateStep2 = useCallback(() => {
    const e = {};
    if (!customer.name || !customer.name.trim()) e.name = "Name is required";
    if (!/^\d{10}$/.test(String(customer.mobile || ""))) e.mobile = "Enter a valid 10-digit mobile";
    if (!customer.address || !customer.address.trim()) e.address = "Address is required";
    if (!customer.terms) e.terms = "You must agree to terms";
    if (!locationCaptured) e.location = "Please capture location";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [customer, locationCaptured]);

  const submitOrder = useCallback(async () => {
    if (submitting) return;
    setErrors({});
    setSubmitError("");
    if (!cart || cart.length === 0) return;
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
      formData.append("items", JSON.stringify(
        cart.map((it) => ({
          id: it.id ?? it.sku ?? null,
          title: it.title,
          brand: it.brand ?? "",
          qty: it.qty ?? 0,
          unitPrice: Number(it.offer_price ?? it.price ?? 0),
          weight: it.weight ?? it.unit ?? "",
        }))
      ));

      const res = await fetch(scriptURL, { method: "POST", body: formData });

      if (!res.ok) {
        let txt = "";
        try { txt = await res.text(); } catch (readErr) { console.warn("failed reading response text:", readErr); }
        try {
          const j = txt ? JSON.parse(txt) : null;
          throw new Error(j && j.error ? j.error : `Submission failed ${res.status}`);
        } catch (parseErr) {
          throw new Error(`Submission failed ${res.status}`);
        }
      }

      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (err) { data = null; }

      const returnedOrderId = (data && (data.orderId || data.order_id)) || orderId;

      try {
        deleteCookie("rice_cart");
        deleteCookie("rice_customer");
        sessionStorage.removeItem("cart");
      } catch (err) {
        console.warn("clearing storage/cookies failed:", err);
      }

      setCart([]);
      navigate("/success", { state: { orderId: returnedOrderId } });
      return;
    } catch (err) {
      console.error("Order submit error", err);
      setSubmitError(err?.message || "Order failed. Please try again.");
      setErrors((p) => ({ ...p, submit: err?.message }));
    } finally {
      setSubmitting(false);
    }
  }, [submitting, cart, customer, latitude, longitude, mapsUrl, total, orderId, navigate]);

  if (!cart || cart.length === 0) return null;

  const steps = [1, 2, 3];

  return (
    <div className="checkout-page">
      <div className="checkout-container" role="main">
        <header className="checkout-header">
          <h1>Checkout</h1>

          {/* Stepper (visual) */}
          <div className="checkout-stepper" aria-hidden="true">
            {steps.map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={`step ${step === s ? "active" : step > s ? "completed" : ""}`}
                  aria-current={step === s ? "step" : undefined}
                >
                  {s}
                </div>

                {/* connector between steps (except after last) */}
                {i < steps.length - 1 && (
                  <div className={`connector ${step > s ? "active" : ""}`} />
                )}
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
          {step === 1 && (
            <section className="step-panel panel-1" aria-labelledby="review-heading">
              <h2 id="review-heading">1. Review your cart</h2>

              <div className="cart-list">
                {cart.map((item, idx) => {
                  const candidate =
                    (item.images && Array.isArray(item.images) && item.images[0]) ||
                    item.image ||
                    item.thumbnail ||
                    "";
                  const thumb = buildImageUrl(candidate);

                  const unitOrig = Number(item.price ?? item.offer_price ?? 0);
                  const unitOffer = Number(item.offer_price ?? item.price ?? 0);
                  const qty = Number(item.qty ?? 0);
                  const lineOrigTotal = unitOrig * qty;
                  const lineOfferTotal = unitOffer * qty;
                  const lineSaved = Math.max(0, lineOrigTotal - lineOfferTotal);
                  const linePercent = unitOrig > 0 ? ((unitOrig - unitOffer) / unitOrig) * 100 : 0;

                  return (
                    <div className="cart-row" key={`${item.id ?? item.title}-${idx}`}>
                      <div className="cart-row-left">
                        <div className="cart-thumb-img-wrapper">
                          {thumb ? (
                            <img src={thumb} alt={item.title} className="cart-thumb" />
                          ) : (
                            <div className="cart-thumb" aria-hidden />
                          )}
                        </div>

                        <div>
                          <div className="cart-title">{item.title}</div>
                          <div className="cart-sub">{item.brand ? `${item.brand} • ${item.weight ?? ""}` : item.weight ?? ""}</div>

                          <div className="cart-pricing-row">
                            {Number(item.offer_price) && Number(item.price) && Number(item.price) > Number(item.offer_price) ? (
                              <>
                                <span className="orig-price" aria-hidden>{currency(unitOrig)}</span>
                                <span className="offer-price">{currency(unitOffer)}</span>
                                <span className="saving-badge" aria-hidden>{linePercent > 0 ? `${Math.round(linePercent)}% off` : "Save"}</span>
                              </>
                            ) : (
                              <span className="offer-price">{currency(unitOffer)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="cart-row-right">
                        <div className="qty-controls">
                          <button type="button" className="qty-btn" onClick={() => updateQty(idx, -1)} aria-label={`Decrease ${item.title}`}>−</button>
                          <span className="qty-display">{item.qty ?? 0}</span>
                          <button type="button" className="qty-btn" onClick={() => updateQty(idx, +1)} aria-label={`Increase ${item.title}`}>+</button>
                        </div>

                        <div className="row-price">{currency(lineOfferTotal.toFixed(2))}</div>

                        {lineSaved > 0 && <div className="line-saved" aria-hidden>Saved {currency(lineSaved.toFixed(2))}</div>}

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

          {step === 2 && (
            <section className="step-panel panel-2" aria-labelledby="details-heading">
              <h2 id="details-heading">2. Customer details</h2>
              <form
                className="customer-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (validateStep2()) setStep(3);
                }}
              >
                <label>
                  Full name
                  <input type="text" value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} aria-invalid={!!errors.name} />
                  {errors.name && <div className="field-error">{errors.name}</div>}
                </label>

                <label>
                  Mobile number
                  <input type="tel" value={customer.mobile} inputMode="numeric" onChange={(e) => setCustomer((c) => ({ ...c, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))} aria-invalid={!!errors.mobile} />
                  {errors.mobile && <div className="field-error">{errors.mobile}</div>}
                </label>

                <label>
                  Delivery address
                  <textarea value={customer.address} onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))} rows={4} aria-invalid={!!errors.address} />
                  {errors.address && <div className="field-error">{errors.address}</div>}
                </label>

                <div className="location-row">
                  <button type="button" className={`btn location-btn ${locationCaptured ? "captured" : ""}`} onClick={captureLocation} disabled={loadingLocation}>
                    <FaMapMarkerAlt /> {loadingLocation ? "Capturing..." : locationCaptured ? "Location captured" : "Capture location"}
                  </button>
                  {mapsUrl && <a href={mapsUrl} rel="noopener noreferrer" target="_blank" className="view-map">View on map</a>}
                </div>
                {errors.location && <div className="field-error">{errors.location}</div>}

                <label className="terms-row">
                  <input type="checkbox" checked={customer.terms} onChange={(e) => setCustomer((c) => ({ ...c, terms: e.target.checked }))} /> I agree to the terms &amp; conditions
                </label>
                {errors.terms && <div className="field-error">{errors.terms}</div>}

                <div className="form-actions panel-2-actions">
                  <button type="button" className="btn" onClick={() => setStep(1)}><FaChevronLeft /> Back</button>
                  <button type="submit" className="btn primary">Next <FaChevronRight /></button>
                </div>
              </form>
            </section>
          )}

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

                {submitError && <div className="submit-error">{submitError}</div>}

                <div className="confirm-actions">
                  <button type="button" className="btn" onClick={() => setStep(2)}><FaChevronLeft /> Back</button>

                  <button type="button" className="btn primary place-order-btn" onClick={submitOrder} disabled={submitting} aria-live="polite">
                    {submitting ? (<><span className="spinner" aria-hidden />Placing order...</>) : (<>Place Order</>)}
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
