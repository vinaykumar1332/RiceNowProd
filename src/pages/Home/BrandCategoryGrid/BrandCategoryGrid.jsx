import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [brands, setBrands] = useState([]);

  // carousel refs & controls
  const carouselRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // visibleCount used for skeleton count (keeps things consistent)
  const [visibleCount, setVisibleCount] = useState(4);
  const updateVisibleCount = useCallback(() => {
    const w = window.innerWidth;
    if (w <= 420) setVisibleCount(2);   // show 2 cards on very small screens
    else if (w <= 760) setVisibleCount(2);
    else if (w <= 1100) setVisibleCount(3);
    else setVisibleCount(4);
  }, []);
  useEffect(() => {
    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, [updateVisibleCount]);

  // ----------------- data loading -----------------
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);

      const cached = loadProductsFromSession && loadProductsFromSession();
      if (cached && Array.isArray(cached) && cached.length > 0) {
        try {
          const grouped = groupByBrand(cached);
          if (!cancelled) {
            const list = objectToBrandArray(grouped);
            setBrands(limitBrands(list, maxBrands));
            setLoading(false);
          }
        } catch (e) {
          // fall through to fetch
        }
      }

      if (!fetchUrl) {
        if (!cancelled) {
          setLoading(false);
          setError('No API URL provided');
        }
        return;
      }

      try {
        const resp = await fetch(fetchUrl, { cache: 'no-store' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const products = Array.isArray(data) ? data : data.products || [];
        try { saveProductsToSession && saveProductsToSession('rn_products', products); } catch (e) {}
        if (!cancelled) {
          const grouped = groupByBrand(products);
          const list = objectToBrandArray(grouped);
          setBrands(limitBrands(list, maxBrands));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          if (!cached) setError(err.message || 'Failed to load products');
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [fetchUrl, maxBrands]);

  // ----------------- helpers -----------------
  function limitBrands(list, limit) {
    if (!limit) return list;
    return list.slice(0, limit);
  }

  function groupByBrand(products = []) {
    return products.reduce((acc, p) => {
      const brand = (p.brand || 'Unknown').toString().trim();
      const key = brand || 'Unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {});
  }

  function objectToBrandArray(grouped) {
    const result = Object.keys(grouped).map((brandName) => {
      const prods = grouped[brandName];
      let imageUrl = null;
      let imageId = null;
      for (const pr of prods) {
        if (pr.image && String(pr.image).trim()) {
          const val = String(pr.image).trim();
          if (val.startsWith('http://') || val.startsWith('https://')) {
            imageUrl = val; break;
          }
          imageId = val;
        } else if (Array.isArray(pr.images) && pr.images.length) {
          const first = pr.images.find(Boolean);
          if (first) {
            const v = String(first).trim();
            if (v.startsWith('http://') || v.startsWith('https://')) {
              imageUrl = v; break;
            }
            imageId = v;
          }
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
    result.sort((a, b) => b.count - a.count);
    return result;
  }

  function handleClick(brandObj) {
    if (onBrandClick) {
      onBrandClick(brandObj.brand, brandObj.products);
      return;
    }
    const encoded = encodeURIComponent(brandObj.brand);
    window.location.href = `/products?brand=${encoded}`;
  }

  // ----------------- carousel controls -----------------
  const updateControls = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanPrev(el.scrollLeft > 10);
    setCanNext(el.scrollLeft < maxScrollLeft - 10);
  }, []);

  useEffect(() => {
    updateControls();
    const el = carouselRef.current;
    if (!el) return;
    let raf = null;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => updateControls());
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateControls);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateControls);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [brands, updateControls]);

  function scrollByCard(direction = 1) {
    const el = carouselRef.current;
    if (!el) return;
    const first = el.querySelector('.bg-card-item');
    if (!first) return;
    const style = getComputedStyle(el);
    const gapPx = parseInt(style.gap || 14, 10) || 14;
    const cardRect = first.getBoundingClientRect();
    const cardW = Math.round(cardRect.width + gapPx);
    el.scrollBy({ left: cardW * direction, behavior: 'smooth' });
    setTimeout(updateControls, 420);
  }

  function onGridKeyDown(e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollByCard(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollByCard(-1); }
  }

  // ----------------- entrance animation using IntersectionObserver -----------------
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const t = entry.target;
        if (entry.isIntersecting) {
          t.classList.add('in-view');
          io.unobserve(t);
        }
      });
    }, { threshold: 0.2 });

    const observeAll = () => {
      Array.from(el.querySelectorAll('.bg-card')).forEach((c) => {
        if (!c.classList.contains('in-view')) io.observe(c);
      });
    };

    observeAll();
    const t1 = setTimeout(observeAll, 300);
    const t2 = setTimeout(observeAll, 900);

    return () => {
      clearTimeout(t1); clearTimeout(t2);
      try { io.disconnect(); } catch (e) {}
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

      {error && !brands.length ? (
        <div className="bg-error">Unable to load products: {error}</div>
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
                        <p className="bg-desc">{b.count} products</p>
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
