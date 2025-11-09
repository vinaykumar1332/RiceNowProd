// src/App.jsx
import React, { useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import Home from "./pages/Home/Home";
import Products from "./pages/Products/Products";
import MyOrders from "./pages/MyOrders/MyOrders";
import NotFound from "./pages/NotFound/NotFound";
import Checkout from "./pages/Checkout/Checkout";
import CheckoutSuccess from "./components/CheckoutSuccess/CheckoutSuccess";
import Contact from "./pages/Contact/Contact";
import CookieConsent from "./components/CookiePolicy/CookieConsent";

export default function App() {
  const initAnalytics = useCallback(() => {
  }, []);

  const teardownAnalytics = useCallback(() => {
  }, []);

  useEffect(() => {
    function onConsentChange(ev) {
      const detail = ev?.detail;
      if (!detail) {
        teardownAnalytics();
        return;
      }

      const prefs = detail.preferences || {};
      if (prefs.analytics || prefs.marketing) {
        initAnalytics();
      } else {
        teardownAnalytics();
      }
    }
    window.addEventListener("rn:cookie-consent-changed", onConsentChange);
    try {
      const raw = (document.cookie || "")
        .split("; ")
        .find((c) => c.startsWith("rn_cookie_consent="));
      if (raw) {
        const val = decodeURIComponent(raw.split("=")[1] || "");
        const parsed = JSON.parse(val || "{}");
        const prefs = parsed.preferences || {};
        if (prefs.analytics || prefs.marketing) initAnalytics();
      }
    } catch (e) {
      // ignore parsing errors
    }

    return () => {
      window.removeEventListener("rn:cookie-consent-changed", onConsentChange);
    };
  }, [initAnalytics, teardownAnalytics]);

  return (
    <BrowserRouter>
      <Navbar />

      {/* CookieConsent placed near the top-level so it overlays / persists across routes */}
      <CookieConsent
        cookieName="rn_cookie_consent"
        storageKey="rn_cookie_consent_meta"
        expireDays={365}
        showDeclineAll={true}
      />

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/success" element={<CheckoutSuccess />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </BrowserRouter>
  );
}
