import React, { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import "./FeaturedDeals.css";

/**
 * FeaturedDeals
 * - safe fetch with AbortController
 * - autoplay with pause-on-hover/focus/touch
 * - RAF-throttled scroll -> active sync
 * - smooth, clamped scrollToIndex
 * - keyboard navigation (ArrowLeft/Right/Home/End)
 */
export default function FeaturedDeals({
  fetchUrl = "/api/deals",
  limit = 8,
  autoplay = true,
  autoplayInterval = 4000,
  onAddToCart = null,
}) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(0);

  const trackRef = useRef(null);
  const autoplayRef = useRef(null);
  const rafRef = useRef(null);
  const isInteractionRef = useRef(false); // pointer/focus/touch pause flag
  const mountedRef = useRef(true);

  // ---------- fetch deals with cancellation ----------
  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(fetchUrl, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        let items = Array.isArray(json) ? json : json?.data ?? json?.products ?? [];
        if (!Array.isArray(items)) items = [];
        items = items.slice(0, Math.max(0, Number(limit) || 0));
        if (mountedRef.current) {
          setDeals(items);
          setActive(0);
        }
      } catch (err) {
        if (mountedRef.current) {
          if (err.name === "AbortError") return;
          setError(err.message || "Failed to load deals");
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    load();
    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [fetchUrl, limit]);

  // ---------- clamp helper ----------
  const clampIndex = useCallback((i) => {
    if (!deals || deals.length === 0) return 0;
    return Math.max(0, Math.min(i, deals.length - 1));
  }, [deals]);

  // ---------- scrollToIndex (centers card) ----------
  const scrollToIndex = useCallback((i, smooth = true) => {
    const track = trackRef.current;
    if (!track) return;
    const idx = clampIndex(Number(i) || 0);
    const card = track.children[idx];
    if (!card) return;
    // center the card in track
    const left = Math.round(card.offsetLeft - (track.clientWidth - card.clientWidth) / 2);
    try {
      track.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    } catch (e) {
      // fallback
      track.scrollLeft = left;
    }
    setActive(idx);
  }, [clampIndex]);

  // ---------- sync active on scroll (RAF-throttled) ----------
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const cards = Array.from(track.children);
        if (!cards.length) return;
        const center = track.scrollLeft + track.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        cards.forEach((c, idx) => {
          const cCenter = c.offsetLeft + c.clientWidth / 2;
          const dist = Math.abs(center - cCenter);
          if (dist < bestDist) { bestDist = dist; best = idx; }
        });
        if (mountedRef.current) setActive((prev) => (prev !== best ? best : prev));
      });
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    // initial sync (no smooth)
    onScroll();

    const onResize = () => { scrollToIndex(active, false); };
    window.addEventListener("resize", onResize);

    return () => {
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scrollToIndex, active]);

  // ---------- autoplay handling ----------
  const clearAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  useEffect(() => {
    // start/stop autoplay respecting interaction and empty list
    clearAutoplay();
    if (!autoplay || !deals.length) return;

    if (!isInteractionRef.current) {
      autoplayRef.current = setInterval(() => {
        setActive((prev) => {
          const next = clampIndex(prev + 1);
          scrollToIndex(next);
          return next;
        });
      }, Math.max(500, Number(autoplayInterval) || 4000));
    }

    return () => clearAutoplay();
  }, [autoplay, autoplayInterval, deals.length, clearAutoplay, clampIndex, scrollToIndex]);

  // ---------- pause/resume on pointer/focus/touch ----------
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const setInteraction = (val) => {
      isInteractionRef.current = val;
      if (val) clearAutoplay();
      else {
        // resume autoplay after short delay (so quick interactions don't restart immediately)
        if (autoplay && deals.length) {
          setTimeout(() => {
            if (!isInteractionRef.current && autoplayRef.current == null) {
              autoplayRef.current = setInterval(() => {
                setActive((prev) => {
                  const next = clampIndex(prev + 1);
                  scrollToIndex(next);
                  return next;
                });
              }, Math.max(500, Number(autoplayInterval) || 4000));
            }
          }, 400);
        }
      }
    };

    const onPointerEnter = () => setInteraction(true);
    const onPointerLeave = () => setInteraction(false);
    const onFocusIn = () => setInteraction(true);
    const onFocusOut = (e) => {
      // if focus moved outside track, resume
      if (!track.contains(e.relatedTarget)) setInteraction(false);
    };

    track.addEventListener("mouseenter", onPointerEnter);
    track.addEventListener("mouseleave", onPointerLeave);
    track.addEventListener("touchstart", onPointerEnter, { passive: true });
    track.addEventListener("touchend", onPointerLeave);
    track.addEventListener("focusin", onFocusIn);
    track.addEventListener("focusout", onFocusOut);

    return () => {
      track.removeEventListener("mouseenter", onPointerEnter);
      track.removeEventListener("mouseleave", onPointerLeave);
      track.removeEventListener("touchstart", onPointerEnter);
      track.removeEventListener("touchend", onPointerLeave);
      track.removeEventListener("focusin", onFocusIn);
      track.removeEventListener("focusout", onFocusOut);
    };
  }, [autoplay, autoplayInterval, deals.length, clearAutoplay, clampIndex, scrollToIndex]);

  // ---------- keyboard navigation on track ----------
  const handleKeyDown = useCallback((e) => {
    if (!deals || !deals.length) return;
    if (e.key === "ArrowRight") { e.preventDefault(); scrollToIndex(active + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); scrollToIndex(active - 1); }
    if (e.key === "Home") { e.preventDefault(); scrollToIndex(0); }
    if (e.key === "End") { e.preventDefault(); scrollToIndex(deals.length - 1); }
  }, [active, deals, scrollToIndex]);

  // ---------- add to cart handler ----------
  const handleAdd = useCallback((deal, e) => {
    e?.stopPropagation();
    if (typeof onAddToCart === "function") {
      onAddToCart(deal);
    } else {
      // fallback behavior: console + global event
      try {
        window.dispatchEvent(new CustomEvent("rn:add-to-cart", { detail: deal }));
      } catch (_) {}
      // eslint-disable-next-line no-console
      console.log("Add to cart", deal);
    }
  }, [onAddToCart]);

  // ---------- render states ----------
  if (loading) {
    return (
      <section className="fd-wrapper" aria-busy="true" aria-live="polite">
        <div className="fd-head">
          <h3>Featured deals</h3>
          <small>Hot offers — limited time</small>
        </div>
        <div className="fd-track fd-skeleton" role="list">
          {Array.from({ length: Math.min(4, limit || 4) }).map((_, i) => (
            <div key={i} className="fd-card fd-card-skel" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="fd-wrapper">
        <div className="fd-head">
          <h3>Featured deals</h3>
        </div>
        <div className="fd-error" role="alert">⚠ {error}</div>
      </section>
    );
  }

  if (!deals || !deals.length) return null;

  return (
    <section className="fd-wrapper" aria-label="Featured deals">
      <div className="fd-head">
        <h3>Featured deals</h3>
        <small>Hot offers — limited time</small>
      </div>

      <div className="fd-track-wrap">
        <div
          className="fd-track"
          ref={trackRef}
          role="list"
          tabIndex={0}
          aria-label="Deals carousel"
          onKeyDown={handleKeyDown}
        >
          {deals.map((d, i) => {
            const price = Math.max(0, Number(d.price ?? d.mrp ?? d.list_price ?? 0) || 0);
            const offer = Math.max(0, Number(d.offer_price ?? d.sale_price ?? d.price ?? 0) || 0);
            const pct = price > 0 ? Math.round((1 - (offer / price)) * 100) : 0;
            const endsAt = d.ends_at ? new Date(d.ends_at) : null;
            const key = d.id ?? d.sku ?? `deal-${i}`;

            return (
              <article
                key={key}
                className={`fd-card ${i === active ? "active" : ""}`}
                role="listitem"
                tabIndex={-1}
                onClick={() => scrollToIndex(i)}
                aria-current={i === active ? "true" : undefined}
                aria-label={d.title || `Deal ${i + 1}`}
              >
                <div className="fd-media">
                  {d.image ? (
                    // using native img; your Image component can replace this if needed
                    <img src={d.image} alt={d.title || "deal image"} loading="lazy" />
                  ) : d.image_url ? (
                    <img src={d.image_url} alt={d.title || "deal image"} loading="lazy" />
                  ) : (
                    <div className="fd-placeholder" aria-hidden="true">{(d.title || "Item").charAt(0)}</div>
                  )}
                  {pct > 0 && <span className="fd-badge" aria-hidden="true">-{pct}%</span>}
                </div>

                <div className="fd-body">
                  <div className="fd-title" title={d.title}>{d.title}</div>
                  <div className="fd-prices">
                    <div className="fd-offer">₹{offer.toFixed(2)}</div>
                    {price > 0 && <div className="fd-old" aria-hidden="true">₹{price.toFixed(2)}</div>}
                  </div>

                  {endsAt && <Countdown endsAt={endsAt} className="fd-countdown" />}
                </div>

                <div className="fd-cta">
                  <button
                    type="button"
                    className="btn fd-add"
                    onClick={(e) => handleAdd(d, e)}
                    aria-label={`Add ${d.title || "item"} to cart`}
                  >
                    Add
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="fd-bullets" role="tablist" aria-label="Featured deals pages">
        {deals.map((_, i) => (
          <button
            key={`b-${i}`}
            type="button"
            className={`fd-dot ${i === active ? "active" : ""}`}
            onClick={() => scrollToIndex(i)}
            aria-label={`Show deal ${i + 1}`}
            aria-pressed={i === active}
          />
        ))}
      </div>
    </section>
  );
}

/* Countdown component (keeps previous behavior but slightly optimized) */
function Countdown({ endsAt, className }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, endsAt.getTime() - now);
  if (diff <= 0) return <div className={className}>Ended</div>;

  const sec = Math.floor((diff / 1000) % 60);
  const min = Math.floor((diff / (1000 * 60)) % 60);
  const hr = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return (
    <div className={className} aria-live="polite">
      {days > 0 ? `${days}d ` : ""}{String(hr).padStart(2, "0")}:{String(min).padStart(2, "0")}:{String(sec).padStart(2, "0")} left
    </div>
  );
}
Countdown.propTypes = { endsAt: PropTypes.instanceOf(Date).isRequired, className: PropTypes.string };

FeaturedDeals.propTypes = {
  fetchUrl: PropTypes.string,
  limit: PropTypes.number,
  autoplay: PropTypes.bool,
  autoplayInterval: PropTypes.number,
  onAddToCart: PropTypes.func,
};
