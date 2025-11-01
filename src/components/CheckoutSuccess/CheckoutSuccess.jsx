import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CommonIcons } from "../../../App.config";
import { FaWindowClose } from "react-icons/fa";
import "./CheckoutSuccess.css";

export default function CheckoutSuccess() {
  const location = useLocation();
  const navigate = useNavigate();

  // fallback: read from localStorage so refresh still shows order id
  const orderId = location?.state?.orderId || window.localStorage.getItem("lastOrderId") || "Unknown";

  useEffect(() => {
    const el = document.querySelector(".cn-success-root .success-container");
    el?.focus();
    // persist lastOrderId so refresh on /success shows it
    if (location?.state?.orderId) {
      try { window.localStorage.setItem("lastOrderId", location.state.orderId); } catch {}
    }
  }, [location]);

  const handleContinueShopping = () => {
    navigate("/", { replace: true });
  };

  const handleTrackOrder = () => {
    try {
      // 1) Try sessionStorage (set earlier when user searched orders or when checkout saved)
      let mobile = sessionStorage.getItem("savedMobile") || "";

      // 2) If not present, try to read customer info from localStorage (optional) or ask user
      if (!mobile) {
        // Try localStorage fallback where some flows might store customer (non-sensitive)
        try {
          const savedCustomer = window.localStorage.getItem("rice_customer");
          if (savedCustomer) {
            const parsed = JSON.parse(savedCustomer);
            if (parsed?.mobile) mobile = String(parsed.mobile).replace(/\D/g, "").slice(0, 10);
          }
        } catch {}
      }

      // 3) If still not present, prompt the user (fallback)
      if (!mobile) {
        const answer = window.prompt("Enter your 10-digit mobile number to track orders:", "");
        if (!answer) return; // user cancelled
        const normalized = String(answer).replace(/\D/g, "").slice(0, 10);
        if (!/^\d{10}$/.test(normalized)) {
          window.alert("Please provide a valid 10-digit mobile number.");
          return;
        }
        mobile = normalized;
      }

      // Save into sessionStorage so MyOrders can pick it up
      sessionStorage.setItem("savedMobile", mobile);

      // Navigate to MyOrders and pass mobile in state as well (double-safety)
      navigate("/orders", { state: { mobile } });
    } catch (err) {
      console.error("track order error:", err);
      // fallback to simple navigation
      navigate("/orders");
    }
  };

  const handleClose = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="cn-success-root" aria-hidden={false}>
      <div className="success-overlay" />

      <div
        className="success-container"
        tabIndex={-1}
        role="alert"
        aria-live="polite"
        aria-labelledby="success-title"
      >
        <button
          className="close-btn"
          onClick={handleClose}
          aria-label="Close and continue shopping"
          title="Close"
        >
     <FaWindowClose />
        </button>

        <div className="success-inner">
          <div className="visuals">
            <div className="image-wrapper" aria-hidden>
              <img
                src={CommonIcons.Delivery}
                alt="Delivery illustration"
                className="delivery-scooter"
                loading="eager"
              />
            </div>
          </div>

          <h1 id="success-title" className="success-title">Order Placed Successfully!</h1>

          <p className="success-message">
            Your order <strong className="order-id">#{orderId}</strong> has been received.
            Our delivery partner will deliver your groceries shortly.
          </p>

          <div className="success-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleContinueShopping}
            >
              Continue Shopping
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleTrackOrder}
            >
              Track Order
              <span className="sr-only"> for order {orderId}</span>
            </button>
          </div>
        </div>

        <div className="confetti-pieces" aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className={`confetti-piece piece-${i + 1}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
