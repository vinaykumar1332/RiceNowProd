import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  FaFacebookF,
  FaInstagram,
  FaTwitter,
  FaYoutube,
  FaLinkedinIn,
  FaEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaGithub
} from "react-icons/fa";
import content from "./footerContent.json";
import "./Footer.css";

function SocialIcon({ name, size = 16 }) {
  const common = { size };
  switch ((name || "").toLowerCase()) {
    case "facebook":
      return <FaFacebookF {...common} />;
    case "instagram":
      return <FaInstagram {...common} />;
    case "twitter":
      return <FaTwitter {...common} />;
    case "youtube":
      return <FaYoutube {...common} />;
    case "linkedin":
      return <FaLinkedinIn {...common} />;
    case "github":
      return <FaGithub {...common} />;
    default:
      return <FaInstagram {...common} />;
  }
}

SocialIcon.propTypes = {
  name: PropTypes.string,
  size: PropTypes.number
};

export default function Footer({ className = "" }) {
  const data = content || {};
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  const onSubscribe = (e) => {
    e.preventDefault();
    setMsg(null);
    const value = (email || "").trim();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setMsg({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setEmail("");
      setMsg({ type: "success", text: "Thanks — you're subscribed!" });
    }, 900);
  };

  return (
    <footer className={`site-footer ${className}`} role="contentinfo" aria-label="Site footer">
      <div className="footer-inner">
        <div className="footer-grid">
          {/* Brand / Description */}
          <div className="col brand-col">
            <div className="brand">
              <div className="brand-name" aria-hidden="true">{data.brand?.name}</div>
              <div className="brand-tag">{data.brand?.tagline}</div>
            </div>
            <p className="brand-desc">{data.brand?.description}</p>

            <div className="contact-block">
              {Array.isArray(data.contact?.addressLines) && data.contact.addressLines.length > 0 && (
                <address className="address" aria-label="Company address">
                  <FaMapMarkerAlt className="ic" aria-hidden="true" />
                  <div className="address-lines">
                    {data.contact.addressLines.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </div>
                </address>
              )}

              <div className="contact-row">
                <FaPhoneAlt className="ic" aria-hidden="true" />
                <a href={`tel:${data.contact?.phone}`}>{data.contact?.phone}</a>
              </div>

              <div className="contact-row">
                <FaEnvelope className="ic" aria-hidden="true" />
                <a href={`mailto:${data.contact?.email}`}>{data.contact?.email}</a>
              </div>
            </div>

            <div className="socials" aria-label="Social links">
              {Array.isArray(data.socials) &&
                data.socials.map((s) => (
                  <a
                    key={s.name}
                    className="social-btn"
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    title={s.label}
                  >
                    <SocialIcon name={s.name} size={14} />
                  </a>
                ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="col links-col" aria-label="Quick links">
            <h4>Quick Links</h4>
            <ul>
              {(data.quickLinks || []).map((l, idx) => (
                <li key={l.href || idx} style={{ ["--i"]: idx + 1 }}>
                  <a href={l.href}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div className="col links-col" aria-label="Company">
            <h4>Company</h4>
            <ul>
              {(data.company || []).map((l, idx) => (
                <li key={l.href || idx} style={{ ["--i"]: idx + 1 }}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col newsletter-col" aria-label="Newsletter signup">
            <h4>{data.newsletter?.title || "Newsletter"}</h4>
            <p className="newsletter-sub">{data.newsletter?.subtitle}</p>

            <form className="newsletter-form" onSubmit={onSubscribe} noValidate>
              <label htmlFor="footer-news-email" className="sr-only">Email address</label>
              <div className="newsletter-row">
                <input
                  id="footer-news-email"
                  type="email"
                  inputMode="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Email address"
                  disabled={submitting}
                />
                <button type="submit" className="btn small" disabled={submitting}>
                  {submitting ? "Joining…" : "Join"}
                </button>
              </div>
              {msg && (
                <div className={`newsletter-msg ${msg.type === "error" ? "error" : "success"}`} role="status" aria-live="polite">
                  {msg.text}
                </div>
              )}
            </form>

            <div className="legal-links" aria-hidden="true">
              {/* kept in DOM for future use (visually hidden if not provided) */}
              {(data.legal || []).map((l, idx) => (
                <a key={l.href || idx} href={l.href} className="legal-link" style={{ display: 'inline-block' }}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* bottom bar */}
        <div className="footer-bottom">
          <div className="copyright">
            &copy; {data?.copyright?.year || new Date().getFullYear()} {data?.copyright?.owner || "Company"} — {data?.copyright?.note}
          </div>

          <div className="footer-actions">
            {/* Enhanced Built-by: avatar, role, tooltip, accessible */}
            <div className="built-by-section" aria-hidden={false}>
              <a
                href={data?.credits?.url || "https://vinaykumar1332.github.io/Hyper-portfolio/"}
                target="_blank"
                rel="noopener noreferrer"
                className="built-by-link"
                aria-label={data?.credits?.label || "Built by Vinay Kumar"}
                data-tooltip={data?.credits?.tooltip || "Open portfolio on GitHub"}
              >
                <span className="built-by-avatar" aria-hidden="true">
                  <FaGithub />
                </span>
                <div>
                  <div className="built-by-text">Built by {data?.credits?.name || "Vinay Kumar"}</div>
                  {data?.credits?.role && <div className="built-by-role" aria-hidden="true">{data.credits.role}</div>}
                </div>
              </a>
            </div>
            {/* removed sitemap/policy links as requested */}
          </div>
        </div>
      </div>
    </footer>
  );
}

Footer.propTypes = {
  className: PropTypes.string
};
