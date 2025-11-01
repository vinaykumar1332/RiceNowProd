import React from "react";
import { useNavigate } from "react-router-dom";
import { CommonIcons } from "../../../App.config";
import "./Contact.css";

export default function Contact() {
  const navigate = useNavigate();

  return (
    <div className="contact-root" role="main" aria-labelledby="contact-title">
      <div className="contact-inner">
        <figure className="illustration" aria-hidden>
          <img
            src={CommonIcons.UnderConstruction}
            alt="Under construction"
            className="underconstruction-img"
            loading="lazy"
          />
        </figure>

        <div className="content">
          <h1 id="contact-title" className="title">Page under construction</h1>
          <p className="subtitle">
            We're building something great here. If you need to reach us, please try one of the options below — or come back soon!
          </p>

          <div className="actions">
            <button
              type="button"
              className="btn btn-back"
              onClick={() => navigate("/", { replace: true })}
              aria-label="Back to home"
              title="Back to home"
            >
              {/* Inline home/back SVG (keeps assets local & consistent) */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
                style={{ marginRight: 8 }}
              >
                <path d="M3 11.5L12 4l9 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 12.5v6a1 1 0 0 0 1 1h3v-5h6v5h3a1 1 0 0 0 1-1v-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to home
            </button>

            <a href="mailto:support@example.com" className="btn btn-outline" title="Email us">
              Contact support
            </a>
          </div>

          <div className="note">
            <strong>TIP:</strong> If you placed an order, use the <code>Orders</code> page to track it.
          </div>
        </div>
      </div>
    </div>
  );
}
