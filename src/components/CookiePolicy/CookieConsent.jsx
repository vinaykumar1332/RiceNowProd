import React, { useEffect, useState, useRef } from "react";
// --- ASSUMED REACT ICON IMPORTS ---
// You MUST install react-icons and ensure these imports are correct:
import { FiSettings, FiCheck, FiX, FiRefreshCw, FiSave, FiTrash2 } from 'react-icons/fi';
import "./cookieConsent.css";

/* -------------------- Cookie + Storage Helpers -------------------- */
function setCookie(name, value, days = 365, path = "/") {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=${path}; SameSite=Lax`;
  } catch (e) {}
}
function getCookie(name) {
  try {
    const re = new RegExp("(?:^|; )" + encodeURIComponent(name) + "=([^;]*)");
    const m = document.cookie.match(re);
    return m ? decodeURIComponent(m[1]) : null;
  } catch (e) { return null; }
}
function eraseCookie(name, path = "/") {
  try {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; SameSite=Lax`;
  } catch (e) {}
}
function clearAllCookies() {
  try {
    const cookies = document.cookie.split(";").map(c => c.trim()).filter(Boolean);
    for (const c of cookies) {
      const eq = c.indexOf("=");
      const name = eq > -1 ? c.substr(0, eq) : c;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  } catch (e) {}
}
function safeClearStorage() {
  try { sessionStorage.clear(); } catch (e) {}
  try { localStorage.clear(); } catch (e) {}
}

/* -------------------- Defaults -------------------- */
const COOKIE_NAME = "rn_cookie_consent";
const STORAGE_KEY = "rn_cookie_consent_meta";
const DEFAULT_CONSENT = {
  version: 1,
  consentedAt: null,
  preferences: { necessary: true, analytics: false, marketing: false },
};

/* -------------------- Component -------------------- */
export default function CookieConsent({
  cookieName = COOKIE_NAME,
  storageKey = STORAGE_KEY,
  expireDays = 365,
  showDeclineAll = true,
  leaveUrl = "https://www.google.com",
}) {
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_CONSENT.preferences);
  const [hasConsent, setHasConsent] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const bannerRef = useRef(null);

  useEffect(() => {
    try {
      const raw = getCookie(cookieName);
      const session = window.sessionStorage?.getItem(storageKey) || window.localStorage?.getItem(storageKey);
      let parsed = null;
      if (raw) {
        try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
      } else if (session) {
        try { parsed = JSON.parse(session); } catch (e) { parsed = null; }
      }

      if (parsed && parsed.preferences) {
        const currentPrefs = {
          necessary: Boolean(parsed.preferences.necessary),
          analytics: Boolean(parsed.preferences.analytics),
          marketing: Boolean(parsed.preferences.marketing),
        };
        setPrefs(currentPrefs);
        setHasConsent(currentPrefs.analytics && currentPrefs.marketing);
        setVisible(false);
      } else {
        setVisible(true);
      }
    } catch (err) {
      setVisible(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function broadcast(detail) {
    try {
      window.dispatchEvent(new CustomEvent("rn:cookie-consent-changed", { detail }));
    } catch (e) {}
  }

  function persistConsent(preferences) {
    const payload = {
      version: DEFAULT_CONSENT.version,
      consentedAt: new Date().toISOString(),
      preferences: {
        necessary: true,
        analytics: Boolean(preferences.analytics),
        marketing: Boolean(preferences.marketing),
      },
    };
    try {
      setCookie(cookieName, JSON.stringify(payload), expireDays);
      try { sessionStorage.setItem(storageKey, JSON.stringify(payload)); } catch (e) { try { localStorage.setItem(storageKey, JSON.stringify(payload)); } catch (_) {} }
    } catch (e) {}
    setPrefs(payload.preferences);
    setHasConsent(payload.preferences.analytics && payload.preferences.marketing);
    setVisible(false);
    setModalOpen(false);
    setBlocked(false);
    broadcast(payload);
  }

  const acceptAll = () => {
    persistConsent({ analytics: true, marketing: true });
  };

  const rejectNonEssential = () => {
    try {
      safeClearStorage();
      clearAllCookies();
    } catch (e) {}

    const payload = {
      version: DEFAULT_CONSENT.version,
      consentedAt: new Date().toISOString(),
      preferences: { necessary: true, analytics: false, marketing: false },
    };
    try {
      setCookie(cookieName, JSON.stringify(payload), expireDays);
      try { sessionStorage.setItem(storageKey, JSON.stringify(payload)); } catch (e) {}
    } catch (e) {}
    
    setPrefs(payload.preferences);
    setHasConsent(false);
    setVisible(false);
    setModalOpen(false);
    setBlocked(true);

    broadcast(payload);
    
    window.location.reload(); 
  };

  const savePreferences = () => {
    persistConsent(prefs);
  };

  const revokeConsent = () => {
    try {
      eraseCookie(cookieName);
    } catch (e) {}
    try { sessionStorage.removeItem(storageKey); } catch (e) {}
    try { localStorage.removeItem(storageKey); } catch (e) {}
    setHasConsent(false);
    setVisible(true);
    broadcast(null);
  };

  const toggle = (key) => {
    if (key === "necessary") return;
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (ev) => { if (ev.key === "Escape") setModalOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  useEffect(() => {
    if (!blocked) {
      document.body.style.overflow = "";
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, [blocked]);

  const leaveSite = () => {
    window.location.href = leaveUrl;
  };

  const isFullyAccepted = hasConsent && prefs.analytics && prefs.marketing;

  if (!visible && !modalOpen && !blocked && !isFullyAccepted) {
    return (
      <button
        type="button"
        className="cookie-manage-floating"
        onClick={() => setModalOpen(true)}
        aria-label="Manage cookie preferences"
        title="Cookie preferences"
      >
        <FiSettings size={14} className="icon-placeholder" />
        Cookies
      </button>
    );
  }

  return (
    <>
      {/* Blocking overlay shown when user rejected non-essential cookies */}
      {blocked && (
        <div className="cookie-blocker" role="alertdialog" aria-modal="true" aria-label="Cookies required">
          <div className="cookie-blocker-inner">
            <h2>Cookies required to continue</h2>
            <p>
              You chose to reject non-essential cookies. To protect your privacy we cleared storage and cookies, and the page reloaded.
              This site requires your consent to proceed. You can **Accept all** to continue, or **Leave site**.
            </p>

            <div className="blocker-actions">
              <button className="btn btn-primary animated primary-lg" onClick={acceptAll}>
                <FiCheck size={16} />
                Accept all & continue
              </button>
              <button className="btn btn-secondary animated" onClick={leaveSite}>
                <FiX size={16} />
                Leave site
              </button>
              <button className="btn btn-outline animated" onClick={() => { setModalOpen(true); }}>
                <FiSettings size={16} />
                Manage preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner */}
      {visible && (
        <div
          className="cookie-banner slide-up"
          role="region"
          aria-label="Cookie consent banner"
          ref={bannerRef}
        >
          <div className="cookie-banner-inner">
            <div className="cookie-text">
              <strong>We use cookies</strong>
              <p>
                We use necessary cookies to make the site work. With your permission we may also use analytics and marketing cookies to improve the site
                and show relevant ads. You can accept all, reject non-essential, or manage preferences.
              </p>
              <a href="#manage-cookies" onClick={(e) => { e.preventDefault(); setModalOpen(true); }} className="cookie-link">Manage cookies</a>
            </div>

            <div className="cookie-actions">
              <button className="btn btn-outline animated" onClick={() => setModalOpen(true)} aria-label="Open cookie preferences">
                <FiSettings size={14} />
                Preferences
              </button>

              <button className="btn btn-primary animated primary-lg" onClick={acceptAll} aria-label="Accept all cookies">
                <FiCheck size={16} />
                Accept all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal (manage preferences) */}
      {modalOpen && (
        <div className="cookie-modal-backdrop" role="dialog" aria-modal="true" aria-label="Manage cookie preferences">
          <div className="cookie-modal slide-in" role="document">
            <header className="cookie-modal-header">
              <h2>Cookie preferences</h2>
              <button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Close preferences">✕</button>
            </header>

            <div className="cookie-modal-body">
              <p>
                You can control which cookies are used. Necessary cookies are required for the site to function and cannot be turned off.
              </p>

              <div className="cookie-category">
                <div className="category-left">
                  <div className="category-title">Necessary</div>
                  <div className="category-desc">Required for core functionality (session, security).</div>
                </div>
                <div className="category-right">
                  <label className="toggle disabled">
                    <input type="checkbox" checked readOnly aria-hidden="true" />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="cookie-category">
                <div className="category-left">
                  <div className="category-title">Analytics</div>
                  <div className="category-desc">Helps us understand how visitors use the site (e.g. Google Analytics).</div>
                </div>
                <div className="category-right">
                  <label className={`toggle ${prefs.analytics ? "on" : "off"}`} tabIndex={0} role="switch" aria-checked={prefs.analytics} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle("analytics"); } }}>
                    <input type="checkbox" checked={prefs.analytics} onChange={() => toggle("analytics")} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="cookie-category">
                <div className="category-left">
                  <div className="category-title">Marketing</div>
                  <div className="category-desc">Used to show relevant ads and promotions across websites.</div>
                </div>
                <div className="category-right">
                  <label className={`toggle ${prefs.marketing ? "on" : "off"}`} tabIndex={0} role="switch" aria-checked={prefs.marketing} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle("marketing"); } }}>
                    <input type="checkbox" checked={prefs.marketing} onChange={() => toggle("marketing")} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="cookie-legal">
                <small>
                  For more information, see our <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
                </small>
              </div>
            </div>

            <footer className="cookie-modal-footer">
              <div className="footer-left">
                <button className="btn btn-ghost" onClick={revokeConsent}>
                  <FiTrash2 size={12} className="small-icon" />
                  Forget consent
                </button>
              </div>
              <div className="footer-right">
                {showDeclineAll && (
                  <button className="btn btn-secondary animated" onClick={rejectNonEssential}>
                    <FiRefreshCw size={14} />
                    Reject non-essential
                  </button>
                )}
                <button className="btn btn-outline animated" onClick={() => { setModalOpen(false); setVisible(true); }}>Cancel</button>
                <button className="btn btn-primary animated" onClick={savePreferences}>
                  <FiSave size={14} />
                  Save preferences
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

// Example component using the consent state for conditional logic (Download button)
export function ProductDownloadButton({ productName, downloadAction, cookieConsentState }) {
  // Check if necessary consent is present for the action
  const canDownloadProduct = cookieConsentState?.preferences?.necessary || cookieConsentState?.preferences?.analytics || cookieConsentState?.preferences?.marketing;

  const handleClick = () => {
    if (canDownloadProduct) {
      downloadAction(productName);
      // Example of setting session storage confirmation after consent/action
      try {
        sessionStorage.setItem(`downloaded_${productName}`, new Date().toISOString());
      } catch (e) {}
    } else {
      alert("Please accept cookies to proceed with the download.");
    }
  };

  return (
    <button
      className={`btn ${canDownloadProduct ? 'btn-primary' : 'btn-disabled'}`}
      onClick={handleClick}
      disabled={!canDownloadProduct}
    >
      {canDownloadProduct ? "Download Product" : "Consent Required for Download"}
    </button>
  );
}