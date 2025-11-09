import React, { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import { IoIosRefresh } from "react-icons/io";
import "./MetaHeader.css";

export default function MetaHeader({
  initialDelay = 1200,
  autoReload = true,
  reloadDelay = 700,
  onCleared = null,
}) {
  const [visible, setVisible] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [status, setStatus] = useState("");
  const mountedRef = useRef(true);
  const showTimer = useRef(null);
  const hideTimer = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    showTimer.current = setTimeout(() => {
      if (mountedRef.current) setVisible(true);
    }, Math.max(0, Number(initialDelay) || 1200));

    return () => {
      mountedRef.current = false;
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [initialDelay]);

  // Helper: robust cookie clearing (tries domain variants + path=/)
  const clearAllCookies = async () => {
    try {
      const cookies = document.cookie ? document.cookie.split(";") : [];
      if (!cookies.length) return;
      const hostname = window.location.hostname;
      const domainParts = hostname.split(".").filter(Boolean);
      const domainCandidates = [];
      for (let i = 0; i < domainParts.length - 0; i++) {
        domainCandidates.push(domainParts.slice(i).join("."));
      }

      const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
      for (const raw of cookies) {
        const cookie = raw.trim();
        if (!cookie) continue;
        const eq = cookie.indexOf("=");
        const name = eq > -1 ? cookie.substring(0, eq) : cookie;
        const attempts = [
          `${name}=;expires=${expires};path=/;`,
          `${name}=;expires=${expires};path=/;SameSite=None;Secure;`,
        ];
        for (const d of domainCandidates) {
          attempts.push(`${name}=;expires=${expires};path=/;domain=${d};`);
          attempts.push(`${name}=;expires=${expires};path=/;domain=${d};SameSite=None;Secure;`);
        }
        for (const s of attempts) {
          try {
            document.cookie = s;
          } catch (_) {
          }
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("clearAllCookies error", err);
    }
  };

  const clearCachesAndWorkers = async () => {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (err) {
    }

    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (err) {
    }
  };

  const clearAll = async () => {
    if (clearing) return;
    setClearing(true);
    setStatus("Clearing cached data...");

    await new Promise((res) => setTimeout(res, 80));

    try {
      try {
        localStorage.clear();
      } catch (e) { /* ignore */ }
      try {
        sessionStorage.clear();
      } catch (e) { /* ignore */ }

      await clearAllCookies();
      await clearCachesAndWorkers();

      setStatus("Cache cleared.");
      
      if (typeof onCleared === "function") {
        try { onCleared(); } catch (e) { /* ignore */ }
      }

      // 1. Hide the header immediately (for component state)
      setVisible(false);
      
      // 2. Schedule a short timeout for the page reload
      if (autoReload) {
        setTimeout(() => {
          try {
            window.location.reload();
          } catch (_) {
          }
        }, Math.max(0, Number(reloadDelay) || 700));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("clearAll failed:", err);
      setStatus("Failed to clear everything — check console.");
      
      // Still set visible to false after error if no reload
      hideTimer.current = setTimeout(() => {
        if (mountedRef.current) setVisible(false);
      }, 700);
    } finally {
      if (mountedRef.current) setClearing(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      // Class updated to use 'visible' state for control and 'clearing' for button state
      className={`meta-header ${visible ? "is-visible" : "is-hidden"} ${clearing ? "is-clearing" : ""}`}
      aria-live="polite"
      role="region"
      aria-label="Temporary site cache controls"
    >
      <div className="meta-content">
        <span className="meta-text">
          Using cached data for faster loading — Refresh for latest updates
        </span>

        <div className="meta-actions">
          <button
            className={`meta-refresh-btn ${clearing ? "busy" : ""}`}
            onClick={clearAll}
            title={clearing ? "Clearing..." : "Clear cache and refresh for latest data"}
            aria-busy={clearing}
            aria-disabled={clearing}
            disabled={clearing}
          >
            <IoIosRefresh className="ic" aria-hidden="true" />
            <span className="label">{clearing ? "Clearing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        {status}
      </div>
    </div>
  );
}

MetaHeader.propTypes = {
  initialDelay: PropTypes.number,
  autoReload: PropTypes.bool,
  reloadDelay: PropTypes.number,
  onCleared: PropTypes.func,
};