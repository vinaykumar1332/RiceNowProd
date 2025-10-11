import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { VITE_PRODUCTS_API } from "../../../API";
import { saveProductsToSession, loadProductsFromSession } from "../../../utils/storage";
import Image from "../../../pages/Products/Images/Image";
import { FaShoppingCart } from "react-icons/fa";
import "./PopularCategoryGrid.css";

function safeToString(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PopularCategoryGrid({
  fetchUrl = VITE_PRODUCTS_API,
  onCategoryClick = null,
  onBuyNow = null,
  columns = 4,
  maxCategories = 8,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    function normalizeCategoryValue(c) {
      if (!c && c !== 0) return "Uncategorized";
      if (Array.isArray(c)) return safeToString(c.find(Boolean)) || "Uncategorized";
      if (typeof c === "object")
        return safeToString(c.name || c.title || c.label || c.value || "Uncategorized");
      return safeToString(c).trim() || "Uncategorized";
    }

    function groupByCategory(products = []) {
      return products.reduce((acc, p) => {
        const candidates = [
          p.category, p.categories, p.category_name, p.Category, p.cat,
          p.categoryId, p.taxonomy, p.type, p.group, p.product_type,
          ...(Array.isArray(p.tags) ? p.tags : []),
        ];

        let found = null;
        for (const c of candidates) {
          if (!c) continue;
          if (Array.isArray(c) && c.length) {
            const first = c.find(Boolean);
            if (first) { found = normalizeCategoryValue(first); break; }
          } else if (typeof c === "string" && c.trim()) {
            found = normalizeCategoryValue(c); break;
          } else if (typeof c === "object" && (c.name || c.title || c.label)) {
            found = normalizeCategoryValue(c); break;
          }
        }

        const key = found || "Uncategorized";
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
      }, {});
    }

    function objectToCategoryArray(grouped) {
      const arr = Object.keys(grouped).map((name) => {
        const prods = grouped[name];
        let imageUrl = null;
        let imageId = null;

        for (const pr of prods) {
          const imgCandidates = [
            pr.image, pr.image_url, pr.imageId, pr.image_id, pr.drive_image_id,
            ...(Array.isArray(pr.images) ? pr.images : []),
          ];
          for (const c of imgCandidates) {
            if (!c) continue;
            const val = String(c).trim();
            if (val.startsWith("http")) { imageUrl = val; break; }
            imageId = val;
          }
          if (imageUrl) break;
        }

        return {
          category: name,
          count: prods.length,
          imageUrl,
          imageId,
          products: prods,
        };
      });

      arr.sort((a, b) => b.count - a.count);
      return arr;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const cached = loadProductsFromSession?.() || [];
        if (cached.length) {
          const grouped = groupByCategory(cached);
          let list = objectToCategoryArray(grouped).slice(0, maxCategories);
          list = shuffleArray(list);
          if (!cancelled) { setCategories(list); setLoading(false); }
        }

        const resp = await fetch(fetchUrl, { cache: "no-store" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        let products =
          data?.products || data?.data?.products || data?.rows || data?.data || (Array.isArray(data) ? data : []);
        if (!Array.isArray(products)) products = [];

        if (products.length === 0) throw new Error("No products found");

        saveProductsToSession?.("rn_products", products);
        const grouped = groupByCategory(products);
        let list = objectToCategoryArray(grouped).slice(0, maxCategories);
        list = shuffleArray(list);
        if (!cancelled) { setCategories(list); setLoading(false); }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load products");
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [fetchUrl, maxCategories]);

  // Scroll reveal animation
  useEffect(() => {
    const rootEl = containerRef.current;
    if (!rootEl) return;

    const cards = Array.from(rootEl.querySelectorAll(".pcg-card"));
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );

    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [categories]);

  const skeletonCount = Math.max(4, columns);

  function handleCardClick(c) {
    if (onCategoryClick) return onCategoryClick(c.category, c.products);
    window.location.href = `/products?category=${encodeURIComponent(c.category)}`;
  }

  function handleBuyNow(e, c) {
    // prevent card click
    e.stopPropagation();
    e.preventDefault();
    const firstProduct = Array.isArray(c.products) && c.products.length ? c.products[0] : null;
    if (typeof onBuyNow === "function") {
      onBuyNow(c.category, firstProduct);
      return;
    }
    // fallback behavior: navigate to products page with buy hint
    const buyId = firstProduct?.id ?? firstProduct?.sku ?? encodeURIComponent(firstProduct?.title ?? "");
    const url = buyId ? `/products?category=${encodeURIComponent(c.category)}&buy=${encodeURIComponent(buyId)}` : `/products?category=${encodeURIComponent(c.category)}`;
    window.location.href = url;
  }

  return (
    <section className="popular-category-grid-wrapper" aria-labelledby="pcg-title">
      <div className="pcg-header">
        <h2 id="pcg-title">Popular Categories</h2>
        <p className="pcg-sub">Customer favorites — refreshed every visit</p>
      </div>

      {loading ? (
        <div className="pcg-grid" ref={containerRef}>
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={i} className="pcg-card pcg-skeleton" />
          ))}
        </div>
      ) : error ? (
        <div className="pcg-error">⚠️ {error}</div>
      ) : categories.length === 0 ? (
        <div className="pcg-empty">No popular categories found.</div>
      ) : (
        <div className="pcg-grid" ref={containerRef} style={{ ["--pcg-columns"]: columns }}>
          {categories.map((c) => (
            <button
              key={c.category}
              type="button"
              className="pcg-card-btn"
              onClick={() => handleCardClick(c)}
              title={`View products in ${c.category}`}
            >
              <article className="pcg-card" aria-label={`${c.category} category`}>
                <div className="pcg-thumb">
                  {c.imageUrl ? (
                    <Image imageUrl={c.imageUrl} alt={`${c.category} image`} size={600} />
                  ) : c.imageId ? (
                    <Image imageId={c.imageId} alt={`${c.category} image`} size={600} />
                  ) : (
                    <div className="pcg-thumb-placeholder" aria-hidden="true">
                      {c.category?.charAt(0) || "C"}
                    </div>
                  )}
                  <span className="pcg-badge" aria-hidden="true">{c.count}</span>
                </div>

                <div className="pcg-body">
                  <h3 className="pcg-name">{c.category}</h3>
                  <p className="pcg-desc">{c.count} products</p>
                </div>

                {/* Buy Now button - stops propagation so main card click is not triggered */}
                <button
                  type="button"
                  className="pcg-buy-btn"
                  onClick={(e) => handleBuyNow(e, c)}
                  aria-label={`Buy now from ${c.category}`}
                  title={`Buy now from ${c.category}`}
                >
                  <FaShoppingCart className="pcg-buy-icon" aria-hidden="true" />
                  <span className="pcg-buy-label"></span>
                </button>
              </article>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

PopularCategoryGrid.propTypes = {
  fetchUrl: PropTypes.string,
  onCategoryClick: PropTypes.func,
  onBuyNow: PropTypes.func,
  columns: PropTypes.number,
  maxCategories: PropTypes.number,
};
