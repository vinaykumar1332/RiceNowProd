import React, { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import "./Hero.css";
import {HeroSlide } from "../HeroBanner/HeroSlide"


export default function Hero({
  slides = HeroSlide,
  primaryColor = "#FF7A00",
  autoPlayMs = 5000,
  height = "420px",
}) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timeoutRef = useRef(null);
  const rootRef = useRef(null);

  const slideCount = slides.length;

  const go = useCallback(
    (to) => {
      if (slideCount === 0) return;
      let next = to;
      if (next < 0) next = slideCount - 1;
      if (next >= slideCount) next = 0;
      setIndex(next);
    },
    [slideCount]
  );

  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  // autoplay with pause
  useEffect(() => {
    if (isPaused || slideCount <= 1) return;
    timeoutRef.current = setTimeout(() => {
      next();
    }, autoPlayMs);
    return () => clearTimeout(timeoutRef.current);
  }, [index, next, isPaused, autoPlayMs, slideCount]);

  // keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // touch/swipe support
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let moved = false;

    const onTouchStart = (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      moved = false;
    };

    const onTouchMove = (e) => {
      const t = e.touches && e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) > 10) moved = true;
      // prevent vertical scroll only if horizontal swipe is significant
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        e.preventDefault();
      }
    };

    const onTouchEnd = (e) => {
      if (!moved) return;
      // simple swipe detection
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      if (dx > 40) prev();
      else if (dx < -40) next();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [next, prev]);

  // Pause on hover/focus
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);
  const handleFocus = () => setIsPaused(true);
  const handleBlur = () => setIsPaused(false);

  const onCTAClick = () => {
    // navigate to products page (adjust path if needed)
    navigate("/products");
  };

  if (!slides || slides.length === 0) {
    return null;
  }

  return (
    <section
      ref={rootRef}
      className="hero"
      style={{ ["--hero-cta-color"]: primaryColor, height }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-roledescription="carousel"
      aria-label="Featured products"
    >
      <div className="hero-inner">
        <div className="hero-carousel" role="region" aria-live={isPaused ? "off" : "polite"}>
          {slides.map((s, i) => {
            const active = i === index;
            return (
              <div
                key={s.id ?? `slide-${i}`}
                className={`hero-slide ${active ? "active" : ""}`}
                aria-hidden={!active}
                style={{ backgroundImage: `url(${s.imageUrl})` }}
              >
                <div className="hero-overlay" aria-hidden={!active}>
                  <div className="hero-copy">
                    {s.title && <h1 className="hero-title">{s.title}</h1>}
                    {s.subtitle && <p className="hero-subtitle">{s.subtitle}</p>}
                    {s.quote && <blockquote className="hero-quote">“{s.quote}”</blockquote>}
                    <div className="hero-actions">
                      <button
                        type="button"
                        className="hero-cta"
                        onClick={onCTAClick}
                        style={{ borderColor: primaryColor, color: primaryColor }}
                      >
                        Shop Now
                      </button>
                      <button
                        type="button"
                        className="hero-cta ghost"
                        onClick={() => navigate("/about")}
                      >
                        Learn more
                      </button>
                    </div>
                  </div>
                </div>
                {/* image element for accessibility & better LCP (hidden visually) */}
                <img className="hero-image-visuallyhidden" src={s.imageUrl} alt={s.title || s.subtitle || "Slide image"} loading={i === index ? "eager" : "lazy"} />
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <button
          type="button"
          className="hero-prev"
          onClick={prev}
          aria-label="Previous slide"
        >
          ‹
        </button>
        <button
          type="button"
          className="hero-next"
          onClick={next}
          aria-label="Next slide"
        >
          ›
        </button>

        {/* Bullets */}
        <div className="hero-bullets" role="tablist" aria-label="Slide indicators">
          {slides.map((s, i) => (
            <button
              key={s.id ?? `bullet-${i}`}
              className={`hero-bullet ${i === index ? "active" : ""}`}
              onClick={() => go(i)}
              aria-label={`Show slide ${i + 1}`}
              aria-selected={i === index}
              role="tab"
            />
          ))}
        </div>

        {/* thumbnails (optional small strip) */}
        <div className="hero-thumbs" aria-hidden="true">
          {slides.map((s, i) => (
            <button
              key={`thumb-${i}`}
              className={`hero-thumb ${i === index ? "active" : ""}`}
              onClick={() => go(i)}
              style={{ backgroundImage: `url(${s.imageUrl})` }}
              aria-hidden="true"
              type="button"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

Hero.propTypes = {
  slides: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      title: PropTypes.string,
      subtitle: PropTypes.string,
      quote: PropTypes.string,
      imageUrl: PropTypes.string.isRequired,
    })
  ).isRequired,
  primaryColor: PropTypes.string,
  autoPlayMs: PropTypes.number,
  height: PropTypes.string,
};
