// src/pages/Checkout/SuccessPage.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";
import "./successPage.css";

export default function SuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const orderIdFromState = (location && location.state && location.state.orderId) || null;
  const queryId = new URLSearchParams(location.search).get("orderId");
  const orderId = orderIdFromState || queryId || "";

  return (
    <div className="success-page">
      <div className="success-card" role="dialog" aria-modal="true" aria-labelledby="success-heading">
        <FaCheckCircle className="success-icon" />
        <h1 id="success-heading">Order placed!</h1>

        {orderId ? (
          <p className="order-id">Your order ID is <strong>{orderId}</strong></p>
        ) : (
          <p className="order-id">Your order has been placed.</p>
        )}

        <p className="eta">We’ll try to deliver within <strong>4–7 days</strong>. Feel good — your order is in safe hands!</p>

        <div className="success-actions">
          <button
            className="btn primary"
            onClick={() => {
              // Immediate redirect to product/home page
              navigate("/products", { replace: true });
            }}
          >
            Continue shopping
          </button>

          <button
            className="btn"
            onClick={() => navigate("/orders")}
          >
            View orders
          </button>
        </div>
      </div>
    </div>
  );
}
