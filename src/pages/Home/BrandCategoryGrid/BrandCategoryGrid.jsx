import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { VITE_PRODUCTS_API } from '../../../API';
import { saveProductsToSession, loadProductsFromSession } from '../../../utils/storage';
import Image from '../../Products/Images/Image';
import './BrandCategoryGrid.css';

export default function BrandCategoryGrid({
  fetchUrl = VITE_PRODUCTS_API,
  onBrandClick = null,
  columns = 4,
  maxBrands = null,
}) {
  // loading / error / raw products
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);

  // carousel refs & controls
  const carouselRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // visibleCount used for skeleton (keeps things consistent)
  const [visibleCount, setVisibleCount] = useState(4);

  // debounce helpers
  const resizeTimer = useRef(null);
  const controlsThrottle = useRef(0);

  // ----------------- responsive visible count -----------------
  const updateVisibleCount = useCallback(() => {
    const w = window.innerWidth;
    if (w <= 420) setVisibleCount(2);
    else if (w <= 760) setVisibleCount(2);
    else if (w <= 1100) setVisibleCount(3);
    else setVisibleCount(columns || 4);
  }, [columns]);

  useEffect(() => {
    updateVisibleCount();
    const onResize = () => {
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => {
        updateVisibleCount();
        updateControls(); // update controls after resize
      }, 120);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateVisibleCount]);

  // ----------------- data loading (session cache + fetch) -----------------
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);

      // attempt to load cached products from session (defensive)
      try {
        const cached = typeof loadProductsFromSession === 'function' ? loadProductsFromSession() : null;
        if (!cancelled && cached && Array.isArray(cached) && cached.length > 0) {
          setProducts(cached);
          setLoading(false);
        }
      } catch (e) {
        // ignore and continue to fetch
      }

      if (!fetchUrl) {
        if (!cancelled) {
          setError('No API URL provided');
          setLoading(false);
        }
        return;
      }

      try {
        const resp = await fetch(fetchUrl, { cache: 'no-store', signal: controller.signal });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const fetchedProducts = Array.isArray(data) ? data : data.products || [];
        // safe save to session
        try {
          if (typeof saveProductsToSession === 'function') {
            // some save helpers expect (key, value) while others expect (value) — try both
            try { saveProductsToSession('rn_products', fetchedProducts); } catch (e) { saveProductsToSession(fetchedProducts); }
          }
        } catch (e) { /* ignore */ }

        if (!cancelled) {
          setProducts(fetchedProducts);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          if (!products || !products.length) setError(err.message || 'Failed to load products');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUrl, maxBrands]);

  // ----------------- compute brands from products (memoized) -----------------
  const brands = useMemo(() => {
    // group by brand using Map for predictable performance
    const grouped = new Map();
    for (const p of products || []) {
      const brandRaw = p && (p.brand || 'Unknown');
      const brand = String(brandRaw ?? 'Unknown').trim() || 'Unknown';
      if (!grouped.has(brand)) grouped.set(brand, []);
      grouped.get(brand).push(p);
    }

    const arr = Array.from(grouped.keys()).map((brandName) => {
      const prods = grouped.get(brandName) || [];
      let imageUrl = null;
      let imageId = null;

      // prefer the first absolute URL found, otherwise first non-empty id
      for (const pr of prods) {
        const tryImage = (val) => {
          if (!val) return false;
          const s = String(val).trim();
          if (!s) return false;
          if (s.startsWith('http://') || s.startsWith('https://')) {
            imageUrl = s;
            return true; // found best
          }
          if (!imageId) imageId = s;
          return false;
        };

        if (pr.image && tryImage(pr.image)) break;
        if (Array.isArray(pr.images) && pr.images.length) {
          const first = pr.images.find(Boolean);
          if (tryImage(first)) break;
        }
      }

      return {
        brand: brandName,
        count: prods.length,
        imageId: imageId || null,
        imageUrl: imageUrl || null,
        products: prods,
      };
    });

    // sort by count desc
    arr.sort((a, b) => b.count - a.count);
    if (!maxBrands) return arr;
    return arr.slice(0, maxBrands);
  }, [products, maxBrands]);

  // ----------------- helpers -----------------
  function handleClick(brandObj) {
    if (!brandObj) return;
    if (typeof onBrandClick === 'function') {
      onBrandClick(brandObj.brand, brandObj.products);
      return;
    }
    // fallback to navigate
    const encoded = encodeURIComponent(brandObj.brand);
    window.location.href = `/products?brand=${encoded}`;
  }

  // ----------------- carousel controls -----------------
  const updateControls = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const maxScrollLeft = Math.max(0, Math.round(el.scrollWidth - el.clientWidth));
    const current = Math.round(el.scrollLeft);
    setCanPrev(current > 8);
    setCanNext(current < maxScrollLeft - 8);
  }, []);

  // throttle updateControls to at most ~60fps but avoid calling too often
  const _throttledUpdateControls = useCallback(() => {
    const now = Date.now();
    if (now - controlsThrottle.current > 50) {
      controlsThrottle.current = now;
      updateControls();
    } else {
      // schedule one more shortly
      setTimeout(updateControls, 60);
    }
  }, [updateControls]);

  useEffect(() => {
    // update on brands change (rendered width might change)
    _throttledUpdateControls();
    const el = carouselRef.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(_throttledUpdateControls);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', _throttledUpdateControls);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', _throttledUpdateControls);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [brands, _throttledUpdateControls]);

  function scrollByCard(direction = 1) {
    const el = carouselRef.current;
    if (!el) return;
    const first = el.querySelector('.bg-card-item');
    if (!first) return;

    const style = getComputedStyle(el);
    const gapPx = parseInt(style.gap || 14, 10) || 14;
    const cardRect = first.getBoundingClientRect();
    const cardW = Math.round(cardRect.width + gapPx);

    // compute target and clamp
    const target = Math.max(0, Math.min(el.scrollLeft + cardW * direction, el.scrollWidth - el.clientWidth));
    // use smooth scroll
    el.scrollTo({ left: target, behavior: 'smooth' });

    // schedule a final controls update
    setTimeout(updateControls, 420);
  }

  function onGridKeyDown(e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollByCard(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollByCard(-1); }
    if (e.key === 'Home') { e.preventDefault(); carouselRef.current?.scrollTo({ left: 0, behavior: 'smooth' }); }
    if (e.key === 'End') { e.preventDefault(); carouselRef.current?.scrollTo({ left: carouselRef.current.scrollWidth, behavior: 'smooth' }); }
  }

  // ----------------- Entrance animation with IntersectionObserver -----------------
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const t = entry.target;
        if (entry.isIntersecting) {
          t.classList.add('in-view');
          io.unobserve(t);
        }
      }
    }, { threshold: 0.2 });

    const observeAll = () => {
      Array.from(el.querySelectorAll('.bg-card')).forEach((c) => {
        if (!c.classList.contains('in-view')) io.observe(c);
      });
    };

    observeAll();
    // re-run shortly to catch late layout changes
    const t1 = setTimeout(observeAll, 300);
    const t2 = setTimeout(observeAll, 900);

    return () => {
      clearTimeout(t1); clearTimeout(t2);
      try { io.disconnect(); } catch (e) { /* ignore */ }
    };
  }, [brands, loading]);

  // skeleton count
  const skeletonCount = Math.max(visibleCount, Math.min(8, visibleCount * 2));

  // ----------------- render -----------------
  return (
    <section className="brand-grid-wrapper" aria-labelledby="brand-grid-title">
      <div className="bg-header">
        <h2 id="brand-grid-title">Shop by Brand</h2>
        <p className="bg-sub">All product groups grouped by brand</p>
      </div>

      {error && (!brands || brands.length === 0) ? (
        <div className="bg-error" role="alert">Unable to load products: {error}</div>
      ) : (
        <div className="bg-carousel" aria-roledescription="carousel">
          <button
            className="bg-carousel-control prev"
            aria-label="Previous brands"
            onClick={() => scrollByCard(-1)}
            disabled={!canPrev}
            aria-hidden={!canPrev}
          >
            <span aria-hidden="true" className="bg-arrow">‹</span>
          </button>

          <div
            ref={carouselRef}
            className="bg-grid"
            role="list"
            tabIndex={0}
            onKeyDown={onGridKeyDown}
            aria-live="polite"
            aria-label="Brand carousel"
          >
            {loading ? (
              Array.from({ length: skeletonCount }).map((_, i) => (
                <div role="listitem" key={`sk-${i}`} className="bg-card-item">
                  <div className="bg-skeleton-card" aria-hidden="true">
                    <div className="bg-thumb-skeleton" />
                    <div className="bg-body">
                      <div className="bg-line-skel title" />
                      <div className="bg-line-skel desc" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              brands.map((b) => (
                <div role="listitem" key={b.brand} className="bg-card-item">
                  <button
                    type="button"
                    className="bg-card-btn"
                    onClick={() => handleClick(b)}
                    title={`View products by ${b.brand}`}
                  >
                    <article className="bg-card" aria-label={`${b.brand} brand`}>
                      <div className="bg-thumb-wrap">
                        {b.imageUrl ? (
                          <div className="bg-thumb-img">
                            <Image imageUrl={b.imageUrl} alt={`${b.brand} image`} size={600} className="internal-img" />
                          </div>
                        ) : b.imageId ? (
                          <div className="bg-thumb-img">
                            <Image imageId={b.imageId} alt={`${b.brand} image`} size={600} className="internal-img" />
                          </div>
                        ) : (
                          <div className="bg-thumb-placeholder" aria-hidden="true">
                            {b.brand.charAt(0) || 'B'}
                          </div>
                        )}
                        <span className="bg-badge" aria-hidden="true">{b.count}</span>
                      </div>

                      <div className="bg-body">
                        <h3 className="bg-name">{b.brand}</h3>
                        <p className="bg-desc">{b.count} product{b.count !== 1 ? 's' : ''}</p>
                      </div>
                    </article>
                  </button>
                </div>
              ))
            )}
          </div>

          <button
            className="bg-carousel-control next"
            aria-label="Next brands"
            onClick={() => scrollByCard(1)}
            disabled={!canNext}
            aria-hidden={!canNext}
          >
            <span aria-hidden="true" className="bg-arrow">›</span>
          </button>
        </div>
      )}
    </section>
  );
}

BrandCategoryGrid.propTypes = {
  fetchUrl: PropTypes.string,
  onBrandClick: PropTypes.func,
  columns: PropTypes.number,
  maxBrands: PropTypes.number,
};
