import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaMapMarkerAlt,
  FaChevronLeft,
  FaChevronRight,
  FaTrash,
} from "react-icons/fa";
import { VITE_Checkout_API } from "../../API";
import "./Checkout.css";
import "./CheckoutSuccess.css"; // keep loader + overlay CSS if you still want overlay styles (optional)

const scriptURL = VITE_Checkout_API;

function setCookie(name, value, days = 1) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = "expires=" + d.toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/`;
  } catch (e) {}
}
function getCookie(name) {
  try {
    const k = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(k) === 0) return decodeURIComponent(c.substring(k.length));
    }
  } catch (e) {}
  return null;
}
function deleteCookie(name) {
  document.cookie = `${name}=; Max-Age=0; path=/`;
}
function generateOrderID() {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 10 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}
function currency(n) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialCart = useMemo(() => {
    const s = location?.state?.cart;
    if (Array.isArray(s) && s.length > 0) return s;
    try {
      const ss = JSON.parse(sessionStorage.getItem("cart") || "[]");
      if (Array.isArray(ss) && ss.length > 0) return ss;
    } catch (e) {}
    try {
      const cookie = getCookie("rice_cart");
      if (cookie) {
        const parsed = JSON.parse(cookie);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  }, [location]);

  const [cart, setCart] = useState(initialCart);
  const [orderId] = useState(generateOrderID());
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState(() => {
    const saved = getCookie("rice_customer");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
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

  const total = useMemo(
    () =>
      cart.reduce(
        (s, i) => s + (Number(i.offer_price ?? i.price ?? 0) * (i.qty ?? 0)),
        0
      ),
    [cart]
  );

  useEffect(() => {
    try {
      sessionStorage.setItem("cart", JSON.stringify(cart));
      setCookie("rice_cart", JSON.stringify(cart), 1);
    } catch (e) {}
  }, [cart]);

  useEffect(() => {
    if (!cart || cart.length === 0) {
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      setCookie("rice_customer", JSON.stringify(customer), 1);
    } catch (e) {}
  }, [customer]);

  const updateQty = (idx, delta) => {
    setCart((prev) => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        qty: Math.max(0, (copy[idx].qty ?? 0) + delta),
      };
      return copy.filter((it) => (it.qty ?? 0) > 0);
    });
  };

  const removeItem = (idx) => {
    setCart((prev) => {
      const copy = [...prev];
      copy.splice(idx, 1);
      return copy;
    });
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setErrors((p) => ({ ...p, location: "Geolocation not supported" }));
      return;
    }
    setLoadingLocation(true);
    setErrors((p) => ({ ...p, location: undefined }));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords;
        setLatitude(lat);
        setLongitude(lon);
        setMapsUrl(`https://www.google.com/maps?q=${lat},${lon}`);
        setLocationCaptured(true);
        setLoadingLocation(false);
      },
      (err) => {
        setLoadingLocation(false);
        setLocationCaptured(false);
        if (err.code === err.PERMISSION_DENIED)
          setErrors((p) => ({ ...p, location: "Location permission denied" }));
        else if (err.code === err.POSITION_UNAVAILABLE)
          setErrors((p) => ({ ...p, location: "Location unavailable" }));
        else setErrors((p) => ({ ...p, location: "Unable to capture location" }));
      },
      { timeout: 10000 }
    );
  };

  const validateStep2 = () => {
    const e = {};
    if (!customer.name.trim()) e.name = "Name is required";
    if (!/^\d{10}$/.test(customer.mobile))
      e.mobile = "Enter a valid 10-digit mobile";
    if (!customer.address.trim()) e.address = "Address is required";
    if (!customer.terms) e.terms = "You must agree to terms";
    if (!locationCaptured) e.location = "Please capture location";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitOrder = async () => {
    if (submitting) return;
    setErrors({});
    setSubmitError("");
    if (cart.length === 0) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("orderId", orderId);
      formData.append("name", customer.name);
      formData.append("mobile", customer.mobile);
      formData.append("address", customer.address);
      formData.append("terms", customer.terms ? "Yes" : "No");
      formData.append("latitude", latitude || "");
      formData.append("longitude", longitude || "");
      formData.append("mapsUrl", mapsUrl || "");
      formData.append("totalPrice", total.toFixed(2));
      formData.append(
        "items",
        JSON.stringify(
          cart.map((it) => ({
            id: it.id ?? it.sku ?? null,
            title: it.title,
            brand: it.brand ?? "",
            qty: it.qty ?? 0,
            unitPrice: Number(it.offer_price ?? it.price ?? 0),
            weight: it.weight ?? it.unit ?? "",
          }))
        )
      );

      const res = await fetch(scriptURL, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let txt = await res.text().catch(() => "");
        try {
          const j = txt ? JSON.parse(txt) : null;
          throw new Error(j && j.error ? j.error : `Submission failed ${res.status}`);
        } catch (parseErr) {
          throw new Error(`Submission failed ${res.status}`);
        }
      }

      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (err) {
        data = null;
      }

      const returnedOrderId = (data && (data.orderId || data.order_id)) || orderId;

      // Clear cart/cookies/storage now that order is accepted
      try {
        deleteCookie("rice_cart");
        deleteCookie("rice_customer");
        sessionStorage.removeItem("cart");
      } catch (e) {}

      setCart([]); // empty UI cart

      // Navigate to success page and pass orderId in state
      navigate("/success", { state: { orderId: returnedOrderId } });
      return;
    } catch (err) {
      console.error("Order submit error", err);
      setSubmitError(err.message || "Order failed. Please try again.");
      setErrors((p) => ({ ...p, submit: err.message }));
    } finally {
      setSubmitting(false);
    }
  };

  if (!cart || cart.length === 0) return null;

  return (
    <div className="checkout-page">
      <div className="checkout-container" role="main">
        <header className="checkout-header">
          <h1>Checkout</h1>
          <div className="checkout-stepper" aria-hidden>
            <div className={`step ${step >= 1 ? "active" : ""}`}>1</div>
            <div className={`step ${step >= 2 ? "active" : ""}`}>2</div>
            <div className={`step ${step >= 3 ? "active" : ""}`}>3</div>
            <div className="step-labels">
              <span>Review</span>
              <span>Details</span>
              <span>Confirm</span>
            </div>
          </div>
        </header>

        <main className="checkout-main">
          {step === 1 && (
            <section className="step-panel" aria-labelledby="review-heading">
              <h2 id="review-heading">1. Review your cart</h2>
              <div className="cart-list">
                {cart.map((item, idx) => (
                  <div
                    className="cart-row"
                    key={`${item.id ?? item.title}-${idx}`}
                  >
                    <div className="cart-row-left">
                      <div className="cart-thumb-img-wrapper">
                        <div
                          className="cart-thumb"
                          style={{
                            backgroundImage: `url(${(item.images && item.images[0]) ||
                              item.image ||
                              ""})`,
                          }}
                        />
                      </div>
                      <div>
                        <div className="cart-title">{item.title}</div>
                        <div className="cart-sub">
                          {item.brand ? `${item.brand} • ${item.weight ?? ""}` : item.weight ?? ""}
                        </div>
                        <div className="cart-unit">
                          Unit: {currency(Number(item.offer_price ?? item.price ?? 0))}
                        </div>
                      </div>
                    </div>

                    <div className="cart-row-right">
                      <div className="qty-controls">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => updateQty(idx, -1)}
                          aria-label={`Decrease ${item.title}`}
                        >
                          −
                        </button>
                        <span className="qty-display">{item.qty ?? 0}</span>
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => updateQty(idx, +1)}
                          aria-label={`Increase ${item.title}`}
                        >
                          +
                        </button>
                      </div>
                      <div className="row-price">
                        {currency(
                          (Number(item.offer_price ?? item.price ?? 0) * (item.qty ?? 0)).toFixed(2)
                        )}
                      </div>
                      <button
                        type="button"
                        className="remove-icon"
                        onClick={() => removeItem(idx)}
                        aria-label="Remove item"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="summary">
                <div className="summary-row">
                  <span>Total</span>
                  <strong>{currency(total)}</strong>
                </div>
                <div className="summary-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => navigate(-1)}
                  >
                    <FaChevronLeft /> Continue shopping
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => setStep(2)}
                  >
                    Proceed to details <FaChevronRight />
                  </button>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="step-panel" aria-labelledby="details-heading">
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
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, name: e.target.value }))
                    }
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && <div className="field-error">{errors.name}</div>}
                </label>

                <label>
                  Mobile number
                  <input
                    type="tel"
                    value={customer.mobile}
                    inputMode="numeric"
                    onChange={(e) =>
                      setCustomer((c) => ({
                        ...c,
                        mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                      }))
                    }
                    aria-invalid={!!errors.mobile}
                  />
                  {errors.mobile && <div className="field-error">{errors.mobile}</div>}
                </label>

                <label>
                  Delivery address
                  <textarea
                    value={customer.address}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, address: e.target.value }))
                    }
                    rows={4}
                    aria-invalid={!!errors.address}
                  />
                  {errors.address && <div className="field-error">{errors.address}</div>}
                </label>

                <div className="location-row">
                  <button
                    type="button"
                    className={`btn location-btn ${locationCaptured ? "captured" : ""}`}
                    onClick={captureLocation}
                    disabled={loadingLocation}
                  >
                    <FaMapMarkerAlt /> {loadingLocation ? "Capturing..." : locationCaptured ? "Location captured" : "Capture location"}
                  </button>
                  {mapsUrl && (
                    <a href={mapsUrl} rel="noopener noreferrer" target="_blank" className="view-map">
                      View on map
                    </a>
                  )}
                </div>
                {errors.location && <div className="field-error">{errors.location}</div>}

                <label className="terms-row">
                  <input
                    type="checkbox"
                    checked={customer.terms}
                    onChange={(e) => setCustomer((c) => ({ ...c, terms: e.target.checked }))}
                  />{" "}
                  I agree to the terms &amp; conditions
                </label>
                {errors.terms && <div className="field-error">{errors.terms}</div>}

                <div className="form-actions panel-2-actions">
                  <button type="button" className="btn" onClick={() => setStep(1)}>
                    <FaChevronLeft /> Back
                  </button>
                  <button type="submit" className="btn primary">
                    Next <FaChevronRight />
                  </button>
                </div>
              </form>
            </section>
          )}

          {step === 3 && (
            <section className="step-panel" aria-labelledby="confirm-heading">
              <h2 id="confirm-heading">3. Review &amp; confirm</h2>

              <div className="confirm-summary">
                <div className="confirm-items">
                  {cart.map((it, idx) => (
                    <div key={`${it.id ?? it.title}-${idx}`} className="confirm-row">
                      <div>
                        <div className="confirm-title">{it.title}</div>
                        <div className="confirm-meta">{it.qty} × {currency(Number(it.offer_price ?? it.price ?? 0))} {it.brand ? `• ${it.brand}` : ""}</div>
                      </div>
                      <div className="confirm-right">
                        {currency(Number(it.qty ?? 0) * Number(it.offer_price ?? it.price ?? 0))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="confirm-totals">
                  <div className="confirm-line"><span>Total</span><strong>{currency(total)}</strong></div>
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

                  <button
                    type="button"
                    className="btn primary place-order-btn"
                    onClick={submitOrder}
                    disabled={submitting}
                    aria-live="polite"
                  >
                    {submitting ? (
                      <>
                        <span className="spinner" aria-hidden></span>
                        Placing order...
                      </>
                    ) : (
                      <>
                        Place Order
                      </>
                    )}
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
