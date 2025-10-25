import React, { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import "./FeaturedDeals.css";

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
  const isPointerOver = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(fetchUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        // expect array or object with .data/.products
        let items = Array.isArray(json) ? json : json?.data ?? json?.products ?? [];
        if (!Array.isArray(items)) items = [];
        items = items.slice(0, limit);
        if (mounted) {
          setDeals(items);
        }
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load deals");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [fetchUrl, limit]);

  // autoplay: advance by one card by calling scrollToIndex
  useEffect(() => {
    if (!autoplay) return;
    if (!deals.length) return;
    if (isPointerOver.current) return;

    autoplayRef.current = setInterval(() => {
      scrollToIndex((active + 1) % deals.length);
    }, autoplayInterval);

    return () => {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    };
  }, [autoplay, autoplayInterval, deals.length, active]);

  // helper to scroll track to show index
  const scrollToIndex = useCallback((i) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[i];
    if (!card) return;
    const left = card.offsetLeft - (track.clientWidth - card.clientWidth) / 2;
    track.scrollTo({ left, behavior: "smooth" });
    setActive(i);
  }, []);

  // sync active on scroll
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = null;

    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const cards = Array.from(track.children);
        if (!cards.length) return;
        // compute center-based active
        const center = track.scrollLeft + track.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        cards.forEach((c, idx) => {
          const cCenter = c.offsetLeft + c.clientWidth / 2;
          const dist = Math.abs(center - cCenter);
          if (dist < bestDist) { bestDist = dist; best = idx; }
        });
        setActive(best);
      });
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    // run once to set initial
    onScroll();

    return () => {
      track.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [deals.length]);

  // pointer interactions pause autoplay
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onEnter = () => { isPointerOver.current = true; clearInterval(autoplayRef.current); };
    const onLeave = () => { isPointerOver.current = false; };

    track.addEventListener("mouseenter", onEnter);
    track.addEventListener("mouseleave", onLeave);
    track.addEventListener("touchstart", onEnter, { passive: true });
    track.addEventListener("touchend", onLeave);

    return () => {
      track.removeEventListener("mouseenter", onEnter);
      track.removeEventListener("mouseleave", onLeave);
      track.removeEventListener("touchstart", onEnter);
      track.removeEventListener("touchend", onLeave);
    };
  }, []);

  const handleAdd = (deal, e) => {
    e?.stopPropagation();
    if (typeof onAddToCart === "function") {
      onAddToCart(deal);
    } else {
      // fallback: simple console action or custom event
      console.log("Add to cart:", deal);
      // you can dispatch a global event for parent to listen to:
      window.dispatchEvent(new CustomEvent("rn:add-to-cart", { detail: deal }));
    }
  };

  if (loading) {
    return (
      <section className="fd-wrapper">
        <div className="fd-head">
          <h3>Featured deals</h3>
          <small>Hot offers — limited time</small>
        </div>
        <div className="fd-track fd-skeleton">
          {Array.from({ length: Math.min(4, limit) }).map((_,i) => (
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
        <div className="fd-error">⚠ {error}</div>
      </section>
    );
  }

  if (!deals.length) return null;

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
        >
          {deals.map((d, i) => {
            const price = Number(d.price ?? d.mrp ?? d.list_price ?? 0) || 0;
            const offer = Number(d.offer_price ?? d.sale_price ?? d.price ?? 0) || 0;
            const pct = price > 0 ? Math.round((1 - offer / price) * 100) : 0;
            const endsAt = d.ends_at ? new Date(d.ends_at) : null;

            return (
              <article
                key={d.id ?? d.sku ?? `${i}`}
                className={`fd-card ${i === active ? "active" : ""}`}
                role="listitem"
                onClick={() => scrollToIndex(i)}
              >
                <div className="fd-media">
                  {d.image ? (
                    <img src={d.image} alt={d.title || "deal image"} loading="lazy" />
                  ) : d.image_url ? (
                    <img src={d.image_url} alt={d.title || "deal image"} loading="lazy" />
                  ) : (
                    <div className="fd-placeholder">{(d.title || "Item").charAt(0)}</div>
                  )}
                  {pct > 0 && <span className="fd-badge">-{pct}%</span>}
                </div>

                <div className="fd-body">
                  <div className="fd-title" title={d.title}>{d.title}</div>
                  <div className="fd-prices">
                    <div className="fd-offer">₹{offer.toFixed(2)}</div>
                    {price > 0 && <div className="fd-old">₹{price.toFixed(2)}</div>}
                  </div>

                  {endsAt && (
                    <Countdown endsAt={endsAt} className="fd-countdown" />
                  )}
                </div>

                <div className="fd-cta">
                  <button type="button" className="btn fd-add" onClick={(e) => handleAdd(d, e)}>
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

function Countdown({ endsAt, className }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, endsAt.getTime() - now);
  const sec = Math.floor((diff / 1000) % 60);
  const min = Math.floor((diff / (1000 * 60)) % 60);
  const hr = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (diff <= 0) return <div className={className}>Ended</div>;
  return (
    <div className={className} aria-live="polite">
      {days > 0 ? `${days}d ` : ""}{String(hr).padStart(2, "0")}:{String(min).padStart(2, "0")}:{String(sec).padStart(2, "0")} left
    </div>
  );
}
Countdown.propTypes = { endsAt: PropTypes.instanceOf(Date).isRequired, className: PropTypes.string };

/* prop types */
FeaturedDeals.propTypes = {
  fetchUrl: PropTypes.string,
  limit: PropTypes.number,
  autoplay: PropTypes.bool,
  autoplayInterval: PropTypes.number,
  onAddToCart: PropTypes.func,
};
