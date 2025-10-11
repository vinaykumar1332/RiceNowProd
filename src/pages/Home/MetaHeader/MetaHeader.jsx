import React, { useEffect, useState } from "react";
import "./MetaHeader.css";
import { IoIosRefresh } from "react-icons/io";

export default function MetaHeader() {
  const [visible, setVisible] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Show header a few seconds after mount (for subtle entry)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const clearAll = () => {
    try {
      setClearing(true);

      // Clear localStorage & sessionStorage
      localStorage.clear();
      sessionStorage.clear();

      // Clear cookies
      const cookies = document.cookie.split(";");
      for (const c of cookies) {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }

      // Animate out smoothly after clearing
      setTimeout(() => setVisible(false), 600);
    } catch (err) {
      console.warn("Failed to clear data:", err);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`meta-header ${clearing ? "meta-hiding" : ""}`}
      aria-live="polite"
      role="region"
    >
      <div className="meta-content">
        <span className="meta-text">
          Using cached data for faster loading — Refresh for latest updates
        </span>
        <button
          className={`meta-refresh-btn ${clearing ? "busy" : ""}`}
          onClick={clearAll}
          title="Clear cache and refresh for latest data"
        >
          <IoIosRefresh className="ic" />
          <span className="label">Refresh</span>
        </button>
      </div>
    </div>
  );
}