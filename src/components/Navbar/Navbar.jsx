// src/components/Navbar/Navbar.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";
import {
  RiHome5Line,
  RiMailLine,
  RiMenuLine,
  RiCloseLine,
} from "react-icons/ri";
import { BiBowlRice } from "react-icons/bi";
import { BsCart2 } from "react-icons/bs";

const NAV_LINKS = [
  { key: "home", label: "Home", icon: <RiHome5Line />, to: "/" },
  { key: "services", label: "Products", icon: <BiBowlRice />, to: "/products" },
  { key: "orders", label: "Orders", icon: <BsCart2 />, to: "/orders" },
  { key: "contact", label: "Contact", icon: <RiMailLine />, to: "/contact" },
];

// helper to map pathname -> key
function keyFromPath(pathname) {
  if (!pathname) return "home";
  // exact mapping (add more mappings if you have nested routes)
  if (pathname === "/" || pathname === "") return "home";
  if (pathname.startsWith("/products")) return "services";
  if (pathname.startsWith("/orders")) return "orders";
  if (pathname.startsWith("/contact")) return "contact";
  return "home";
}

export default function Navbar() {
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeKey, setActiveKey] = useState(keyFromPath(location.pathname));
  const navLinksRef = useRef(null);
  const mobileBtnRef = useRef(null);
  const logoRef = useRef(null);

  // sync activeKey with route changes (fixes paste-url / refresh case)
  useEffect(() => {
    setActiveKey(keyFromPath(location.pathname));
    // close mobile menu when route changes
    setMobileOpen(false);
  }, [location.pathname]);

  // outside click handler to close mobile slide-down
  useEffect(() => {
    function handler(e) {
      if (!mobileOpen) return;
      if (
        navLinksRef.current?.contains(e.target) ||
        mobileBtnRef.current?.contains(e.target)
      ) {
        return;
      }
      setMobileOpen(false);
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [mobileOpen]);

  // logo shine mousemove
  useEffect(() => {
    const logo = logoRef.current;
    if (!logo) return;
    const onMove = (e) => {
      const bound = logo.getBoundingClientRect();
      const x = e.clientX - bound.left;
      const y = e.clientY - bound.top;
      logo.style.setProperty("--x", `${x}px`);
      logo.style.setProperty("--y", `${y}px`);
    };
    logo.addEventListener("mousemove", onMove);
    return () => logo.removeEventListener("mousemove", onMove);
  }, []);

  const handleLinkClick = () => {
    if (window.innerWidth <= 768) setMobileOpen(false);
  };

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setMobileOpen((s) => !s);
  };

  return (
    <nav className="premium-nav" role="navigation" aria-label="Main navigation">
      <div className="nav-container">
        {/* changed to Link to avoid full page reloads */}
        <Link to="/" className="nav-logo" ref={logoRef} aria-label="Ricenow logo">
          <span className="logo-text">
            Rice
            <i className="fa-solid fa-wheat-awn wheat-icon" aria-hidden />
            now
          </span>
          <div className="logo-shine" />
        </Link>

        <div
          className={`nav-links ${mobileOpen ? "active" : ""}`}
          ref={navLinksRef}
        >
          {NAV_LINKS.map((ln, idx) => (
            <Link
              key={ln.key}
              to={ln.to}
              className={`nav-link ${activeKey === ln.key ? "active" : ""}`}
              onClick={handleLinkClick}
              // optionally set a CSS variable for stagger delay:
              style={{ ["--delay"]: `${0.08 * (idx + 1)}s` }}
            >
              <i aria-hidden="true" className="nav-icon">
                {ln.icon}
              </i>
              <span className="nav-label">{ln.label}</span>
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          <button
            className="mobile-menu"
            aria-label="Menu"
            aria-expanded={mobileOpen}
            onClick={handleMenuToggle}
            ref={mobileBtnRef}
          >
            {mobileOpen ? <RiCloseLine /> : <RiMenuLine />}
          </button>
        </div>
      </div>
    </nav>
  );
}