// src/components/Products/Products.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { useNavigate, useLocation } from "react-router-dom";
import Cards from "./cards/cards";
import "./Products.css";
import { FaFilter } from "react-icons/fa6";
import { FaShoppingCart, FaTrash, FaRegWindowClose } from "react-icons/fa";
import Search from "./Search/Search";
import { VITE_PRODUCTS_API } from "../../API";
import { TiShoppingCart } from "react-icons/ti";
import { cleanTags } from "../../utils/helpers";
import { IoIosRefresh } from "react-icons/io";
import Image from "./Images/Image";
import ImageCarousel from "./Images/ImageCarousel";
import { TfiReload } from "react-icons/tfi";

const PRODUCTS_API = VITE_PRODUCTS_API;
const CACHE_KEY = "rice_products_cache_v1";
const CACHE_META_KEY = "rice_products_meta_v1";
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;

function setCookie(name, value, days = 1) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = "expires=" + d.toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/`;
  } catch (e) {}
}

const isFullUrl = (str) =>
  typeof str === "string" && /^(https?:\/\/|data:|blob:)/i.test(String(str).trim());

function computeStableKey(product) {
  const id = product.id ?? product.sku ?? product.slug ?? null;
  if (id) return String(id);
  if (product.title) return `title:${String(product.title).slice(0, 64)}`;
  try {
    const s = JSON.stringify(product);
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return `hash:${Math.abs(h)}`;
  } catch (e) {
    return `prod-${Math.random().toString(36).slice(2, 9)}`;
  }
}

function resolveImageCandidate(candidate) {
  if (!candidate) return { imageUrl: null, imageId: null };
  if (Array.isArray(candidate) && candidate.length > 0) candidate = candidate[0];
  if (typeof candidate === "object") {
    const possible = candidate.url || candidate.src || candidate.drive_image_id || candidate.imageId || candidate.id;
    if (possible) return resolveImageCandidate(possible);
    if (candidate.full || candidate.large || candidate.medium)
      return resolveImageCandidate(candidate.full || candidate.large || candidate.medium);
    return { imageUrl: null, imageId: null };
  }
  const s = String(candidate).trim();
  if (!s) return { imageUrl: null, imageId: null };
  if (isFullUrl(s)) return { imageUrl: s, imageId: null };
  return { imageUrl: null, imageId: s };
}

function safeStorageAvailable(type = "localStorage") {
  try {
    const storage = window[type];
    const testKey = "__rn_test__";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

function readLocalJSON(key) {
  try {
    if (safeStorageAvailable("localStorage")) {
      const v = localStorage.getItem(key);
      if (v) return JSON.parse(v);
    }
  } catch (err) {}
  try {
    if (safeStorageAvailable("sessionStorage")) {
      const v2 = sessionStorage.getItem(key);
      if (v2) return JSON.parse(v2);
    }
  } catch (err) {}
  return null;
}

function writeLocalJSON(key, value) {
  const json = JSON.stringify(value);
  try {
    if (safeStorageAvailable("localStorage")) {
      localStorage.setItem(key, json);
      return;
    }
  } catch (err) {}
  try {
    if (safeStorageAvailable("sessionStorage")) {
      sessionStorage.setItem(key, json);
      return;
    }
  } catch (err) {}
}

function removeLocal(key) {
  try {
    if (safeStorageAvailable("localStorage")) localStorage.removeItem(key);
  } catch (e) {}
  try {
    if (safeStorageAvailable("sessionStorage")) sessionStorage.removeItem(key);
  } catch (e) {}
}

function simpleHash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    h = h >>> 0;
  }
  return h.toString(36);
}

function readCachedProducts() {
  const data = readLocalJSON(CACHE_KEY);
  const meta = readLocalJSON(CACHE_META_KEY);
  if (!data || !meta) return null;
  return { data, meta };
}

function writeCachedProducts(data, meta = {}) {
  writeLocalJSON(CACHE_KEY, data);
  const finalMeta = {
    ...(readLocalJSON(CACHE_META_KEY) || {}),
    ...meta,
    fetchedAt: Date.now(),
  };
  writeLocalJSON(CACHE_META_KEY, finalMeta);
}

function invalidateCache() {
  removeLocal(CACHE_KEY);
  removeLocal(CACHE_META_KEY);
}

function RefreshBtn({ visible = false, delayMs = 300, onRefresh = () => {}, busy = false }) {
  const [mounted, setMounted] = useState(false);
  const [iconOnly, setIconOnly] = useState(false);
  const mountTimer = useRef(null);
  const iconTimer = useRef(null);

  useEffect(() => {
    if (visible) {
      clearTimeout(mountTimer.current);
      mountTimer.current = setTimeout(() => setMounted(true), delayMs);
      clearTimeout(iconTimer.current);
      iconTimer.current = setTimeout(() => setIconOnly(true), 1800);
    } else {
      clearTimeout(mountTimer.current);
      clearTimeout(iconTimer.current);
      setMounted(false);
      setIconOnly(false);
    }
    return () => {
      clearTimeout(mountTimer.current);
      clearTimeout(iconTimer.current);
    };
  }, [visible, delayMs]);

  const handleClick = (e) => {
    e?.stopPropagation();
    if (busy) return;
    onRefresh && onRefresh();
    setIconOnly(true);
  };

  const wrapperClass = `refresh-overlay-wrapper ${mounted && visible ? "" : "hidden"}`;

  return (
    <div className={wrapperClass} aria-live="polite" role="region" aria-label="Refresh cached data">
      <button
        type="button"
        className={`refresh-badge-btn ${iconOnly ? "icon-only" : "with-text"} ${busy ? "busy" : ""}`}
        onClick={handleClick}
        title={busy ? "Refreshing..." : "Refresh product list"}
        aria-busy={busy}
        aria-label="Refresh products"
      >
        <span className="refresh-icon" aria-hidden="true">
          <IoIosRefresh />
        </span>
        {!iconOnly && <span className="refresh-text">Refresh</span>}
        {busy && <span className="refresh-spinner" aria-hidden="true" />}
      </button>
    </div>
  );
}

RefreshBtn.propTypes = {
  visible: PropTypes.bool,
  delayMs: PropTypes.number,
  onRefresh: PropTypes.func,
  busy: PropTypes.bool,
};

function CartDrawer({ open, onClose, items, onInc, onDec, onRemove, onCheckout }) {
  const total = useMemo(
    () => items.reduce((s, i) => s + (Number(i.offer_price ?? i.price ?? 0) * (i.qty ?? 0)), 0),
    [items]
  );

  return (
    <aside className={`cart-drawer ${open ? "open" : ""}`} aria-hidden={!open} role="dialog" aria-label="Shopping cart">
      <div className="cart-header">
        <h3 className="cart-title">Your Cart</h3>
        <button type="button" className="drawer-close" onClick={onClose} aria-label="Close cart">
          ✕
        </button>
      </div>

      <div className="cart-body">
        {items.length === 0 ? (
          <div className="cart-empty">No items added</div>
        ) : (
          items.map((it) => {
            const cartKey = it._key ?? computeStableKey(it);
            const candidate =
              it._imageCandidate ??
              (it.images && it.images[0]) ??
              it.image ??
              it.image_id ??
              it.drive_image_id ??
              it.driveId ??
              it.id ??
              null;
            const { imageUrl, imageId } = resolveImageCandidate(candidate);

            return (
              <div className="cart-item" key={cartKey}>
                <div className="cart-item-left">
                  <div className="cart-item-wrapper">
                    <div className="cart-thumb" aria-hidden="true">
                      <Image imageUrl={imageUrl} imageId={imageId} alt={it.title || "Product image"} size={160} className="cart-thumb-image" />
                    </div>
                    <div className="cart-item-meta">
                      <div className="cart-title">{it.title}</div>
                      <div className="cart-meta">
                        ₹{Number(it.offer_price ?? it.price ?? 0).toFixed(2)} • {it.weight || "—"} • Qty: {it.qty}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="cart-actions">
                  <button type="button" className="btn" onClick={() => onDec(it)} aria-label="decrease">
                    −
                  </button>
                  <span aria-live="polite" aria-atomic="true">
                    {it.qty}
                  </span>
                  <button type="button" className="btn" onClick={() => onInc(it)} aria-label="increase">
                    +
                  </button>
                  <button type="button" className="remove" onClick={() => onRemove(it)} aria-label="remove">
                    <FaTrash />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="cart-footer">
        <div className="cart-total">
          Total: <strong>₹{total.toFixed(2)}</strong>
        </div>
        <div className="cart-actions-row">
          <button
            type="button"
            title="proceed to checkout"
            className="btn primary checkout"
            aria-label="Checkout"
            onClick={() => onCheckout && onCheckout()}
            disabled={items.length === 0}
          >
            Checkout <TiShoppingCart />
          </button>
          <button type="button" className="btn cancel" onClick={onClose} aria-label="Close cart">
            Cancel
          </button>
        </div>
      </div>
    </aside>
  );
}

CartDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  items: PropTypes.array.isRequired,
  onInc: PropTypes.func.isRequired,
  onDec: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onCheckout: PropTypes.func,
};

function FilterPanel({ open, onClose, filters, current, setCurrent, onReset }) {
  const priceRanges = useMemo(
    () => [
      { label: "Under ₹100", min: 0, max: 100 },
      { label: "₹100 - ₹500", min: 100, max: 500 },
      { label: "₹500 - ₹1000", min: 500, max: 1000 },
      { label: "Over ₹1000", min: 1000, max: Infinity },
    ],
    []
  );

  const brands = useMemo(() => Array.from(filters.brands || []), [filters.brands]);
  const kgOptions = useMemo(() => Array.from(filters.kgs || []), [filters.kgs]);

  const handleCloseClick = useCallback(
    (e) => {
      e.target.blur();
      onClose();
    },
    [onClose]
  );

  return (
    <div className={`filter-panel ${open ? "open" : ""}`} aria-hidden={!open} role="dialog" aria-modal={open} aria-label="Filters">
      <div className="filter-head">
        <h3>Filters</h3>
        <button type="button" className="drawer-close" onClick={handleCloseClick} aria-label="Close filters">
          ✕
        </button>
      </div>

      <div className="filter-body">
        <section className="filter-section-brand">
          <h4>Brand</h4>
          <div className="brand-radios">
            <label>
              <input type="radio" name="brand" value="" checked={!current.brand} onChange={() => setCurrent((c) => ({ ...c, brand: null }))} />
              All
            </label>
            {brands.map((b) => (
              <label key={String(b)}>
                <input type="radio" name="brand" value={b} checked={String(current.brand) === String(b)} onChange={() => setCurrent((c) => ({ ...c, brand: b }))} />
                {b}
              </label>
            ))}
          </div>
        </section>

        <section>
          <h4>Category</h4>
          <div className="chips">
            {(filters.tags || []).map((tag) => (
              <button
                key={String(tag)}
                className={`chip ${current.tags?.includes(tag) ? "active" : ""}`}
                onClick={() => {
                  setCurrent((c) => {
                    const tgs = c.tags ? [...c.tags] : [];
                    const idx = tgs.indexOf(tag);
                    if (idx > -1) tgs.splice(idx, 1);
                    else tgs.push(tag);
                    return { ...c, tags: tgs };
                  });
                }}
                type="button"
                aria-pressed={current.tags?.includes(tag) ? "true" : "false"}
              >
                {tag}
              </button>
            ))}
            {(filters.tags || []).length === 0 && <div className="small-muted">No categories found</div>}
          </div>
        </section>

        <section>
          <h4>Price Ranges</h4>
          <div className="price-checkboxes">
            {priceRanges.map((range) => (
              <label key={range.label}>
                <input
                  type="checkbox"
                  checked={current.priceRanges?.includes(range.label) || false}
                  onChange={(e) => {
                    setCurrent((c) => {
                      const ranges = c.priceRanges ? [...c.priceRanges] : [];
                      if (e.target.checked) ranges.push(range.label);
                      else {
                        const index = ranges.indexOf(range.label);
                        if (index > -1) ranges.splice(index, 1);
                      }
                      return { ...c, priceRanges: ranges };
                    });
                  }}
                />
                {range.label}
              </label>
            ))}
          </div>
        </section>

        <section className="filter-section-kg">
          <h4>Kgs</h4>
          <div className="kg-radios">
            <label>
              <input type="radio" name="kgs" value="" checked={!current.kgs} onChange={() => setCurrent((c) => ({ ...c, kgs: null }))} />
              All
            </label>
            {kgOptions.map((k) => (
              <label key={String(k)}>
                <input type="radio" name="kgs" value={k} checked={String(current.kgs) === String(k)} onChange={() => setCurrent((c) => ({ ...c, kgs: k }))} />
                {k}
              </label>
            ))}
            {kgOptions.length === 0 && <div className="small-muted">No weight info</div>}
          </div>
        </section>

        <div className="filter-actions">
          <button type="button" className="btn primary" onClick={onClose}>
            Apply
          </button>
          <button type="button" className="btn" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

FilterPanel.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  filters: PropTypes.shape({
    brands: PropTypes.instanceOf(Set),
    kgs: PropTypes.instanceOf(Set),
    tags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  current: PropTypes.object.isRequired,
  setCurrent: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};

function ProductDetailsOverlay({ product, onClose, onAdd, onRemove, qty }) {
  if (!product) return null;

  const { title, description, images, image, weight, tags, tags_array, brand } = product;
  const imageListBase = Array.isArray(images) && images.length ? images.slice() : image ? [image] : [];
  if (imageListBase.length === 0) {
    const extra = product.image_id ?? product.drive_image_id ?? product.driveId ?? product.id ?? null;
    if (extra) imageListBase.push(extra);
  }

  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (index >= imageListBase.length) setIndex(Math.max(0, imageListBase.length - 1));
  }, [imageListBase.length, index]);

  useEffect(() => {
    const onKey = (e) => {
      if (!product) return;
      if (e.key === "Escape") {
        onClose && onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product, onClose]);

  const tagList = cleanTags(tags, tags_array);

  if (imageListBase.length === 0) {
    return (
      <div className="details-overlay open" onClick={onClose}>
        <div className="details-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Product details">
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close details">
            ✕
          </button>
          <div className="details-body no-image">
            <div className="details-text">
              <h2>{title}</h2>
              {brand && (
                <p>
                  <strong>Brand:</strong> {brand}
                </p>
              )}
              <p>{description}</p>
              <p>
                <strong>Price:</strong> ₹{product.offer_price ?? product.price}
              </p>
              <p>{weight}</p>
              <div className="tags">{(tagList || []).map((t) => <span key={String(t)} className="tag">{t}</span>)}</div>
            </div>
          </div>
          <div className="qty-controls">
            {qty > 0 ? (
              <>
                <button type="button" onClick={() => onRemove(product)} aria-label="decrease">−</button>
                <span>{qty}</span>
                <button type="button" onClick={() => onAdd(product)} aria-label="increase">+</button>
              </>
            ) : (
              <button type="button" onClick={() => onAdd(product)}>＋ Add</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="details-overlay open" onClick={onClose}>
      <div className="details-content details-carousel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Product details">
        <button type="button" className="drawer-close" onClick={onClose} aria-label="Close details">
          <FaRegWindowClose />
        </button>

        <ImageCarousel images={imageListBase} initialIndex={index} title={title} onIndexChange={(i) => setIndex(i)} />

        <div className="details-meta-block">
          <h2>{title}</h2>
          {brand && (
            <p>
              <strong>Brand:</strong> {brand}
            </p>
          )}
          <p className="details-desc">{description}</p>
          <p>
            <strong>Price:</strong> ₹{product.offer_price ?? product.price}
          </p>
          <p>
            <strong>Weight:</strong> {weight}
          </p>

          <div className="tags">{(tagList || []).map((t) => <span key={String(t)} className="tag">{t}</span>)}</div>

          <div className="qty-controls">
            {qty > 0 ? (
              <>
                <button type="button" onClick={() => onRemove(product)} aria-label="decrease">−</button>
                <span>{qty}</span>
                <button type="button" onClick={() => onAdd(product)} aria-label="increase">+</button>
              </>
            ) : (
              <button type="button" onClick={() => onAdd(product)}>＋ Add</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

ProductDetailsOverlay.propTypes = {
  product: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  qty: PropTypes.number.isRequired,
};

export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem("cart") || "[]");
      return Array.isArray(s) ? s : [];
    } catch (e) {
      return [];
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    brands: new Set(),
    kgs: new Set(),
    tags: [],
    minPrice: 0,
    maxPrice: 1000,
  });
  const [currentFilter, setCurrentFilter] = useState({
    brand: null,
    kgs: null,
    maxPrice: 100000,
    priceRanges: [],
    tags: [],
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [refreshVisible, setRefreshVisible] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [userDismissed, setUserDismissed] = useState(false);

  const isMountedRef = useRef(true);
  const currentFilterRef = useRef(currentFilter);
  useEffect(() => {
    currentFilterRef.current = currentFilter;
  }, [currentFilter]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const filterBtnRef = useRef(null);

  const priceRanges = useMemo(
    () => [
      { label: "Under ₹100", min: 0, max: 100 },
      { label: "₹100 - ₹500", min: 100, max: 500 },
      { label: "₹500 - ₹1000", min: 500, max: 1000 },
      { label: "Over ₹1000", min: 1000, max: Infinity },
    ],
    []
  );

  const extractProducts = useCallback((data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.products)) return data.products;
    if (Array.isArray(data?.rows)) return data.rows;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }, []);

  const dedupeByKey = useCallback((rows) => {
    const seen = new Set();
    const out = [];
    for (let i = 0; i < (rows || []).length; i++) {
      const r = rows[i];
      const key = String(r.id ?? r.sku ?? r.slug ?? r.title ?? JSON.stringify(r));
      if (!seen.has(key)) {
        seen.add(key);
        const normalized = { ...r, _key: computeStableKey(r) };
        normalized._imageCandidate = (r.images && r.images[0]) ?? r.image ?? r.image_id ?? r.drive_image_id ?? r.driveId ?? r.id ?? null;
        out.push(normalized);
      }
    }
    return out;
  }, []);

  const processFilters = useCallback((rows) => {
    const brands = new Set();
    const kgs = new Set();
    const tagsSet = new Set();
    const categories = new Set();
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    rows.forEach((r) => {
      const brand = r.brand ?? r.manufacturer ?? r.mfg ?? r.vendor ?? null;
      if (brand) brands.add(String(brand).trim());

      const w = r.weight ?? r.weight_text ?? r.unit ?? null;
      if (w) {
        const ws = String(w).trim();
        if (ws) kgs.add(ws);
      }

      cleanTags(r.tags, r.tags_array).forEach((t) => {
        if (t) tagsSet.add(t);
      });

      const catCandidates = [r.category, r.categories, r.category_name, r.cat, r.categoryId, r.taxonomy, r.type, r.group];

      catCandidates.forEach((c) => {
        if (!c) return;
        if (typeof c === "string") {
          const val = c.trim();
          if (val) categories.add(val);
        } else if (Array.isArray(c)) {
          c.forEach((x) => {
            if (!x) return;
            if (typeof x === "string") {
              const v = x.trim();
              if (v) categories.add(v);
            } else if (x?.name) {
              const v = String(x.name).trim();
              if (v) categories.add(v);
            }
          });
        } else if (typeof c === "object" && c !== null) {
          const name = c.name ?? c.title ?? c.label;
          if (name) {
            const v = String(name).trim();
            if (v) categories.add(v);
          }
        }
      });

      const p = Number(r.offer_price ?? r.price ?? 0);
      if (!Number.isNaN(p)) {
        min = Math.min(min, p);
        max = Math.max(max, p);
      }
    });

    const finalTags = categories.size > 0 ? [...categories] : [...tagsSet];

    return {
      brands,
      kgs,
      tags: finalTags,
      minPrice: Number.isFinite(min) ? Math.floor(min) : 0,
      maxPrice: Number.isFinite(max) ? Math.ceil(max) : 0,
    };
  }, []);

  const fetchProducts = useCallback(
    async (opts = {}) => {
      const useTTLMs = opts.useTTLMs ?? DEFAULT_CACHE_TTL_MS;
      const force = opts.force ?? false;

      if (!isMountedRef.current) return;

      setLoading(true);
      setError(null);
      if (force) setRefreshBusy(true);

      if (!PRODUCTS_API) {
        setError("Products API not configured.");
        setLoading(false);
        setRefreshBusy(false);
        return;
      }

      try {
        const cached = readCachedProducts();
        const now = Date.now();

        if (cached && !force) {
          const rows = extractProducts(cached.data);
          const uniqueRows = dedupeByKey(rows);
          if (isMountedRef.current) {
            setRaw(uniqueRows);
            setProducts(uniqueRows);
          }

          const processed = processFilters(uniqueRows);
          if (isMountedRef.current) {
            setFilters({
              brands: processed.brands,
              kgs: processed.kgs,
              tags: processed.tags,
              minPrice: processed.minPrice,
              maxPrice: processed.maxPrice,
            });
            setCurrentFilter((c) => ({ ...c, maxPrice: processed.maxPrice }));
          }

          const age = now - (cached.meta?.fetchedAt || 0);
          if (age > useTTLMs / 2 && !userDismissed) {
            setRefreshVisible(true);
          } else {
            setRefreshVisible(false);
          }

          if (age <= useTTLMs) {
            if (isMountedRef.current) {
              setLoading(false);
              setRefreshBusy(false);
            }
            return;
          }
        }

        const meta = (cached && cached.meta) || {};
        const headers = new Headers();
        headers.set("Accept", "application/json");
        if (meta.etag) headers.set("If-None-Match", meta.etag);
        if (meta.lastModified) headers.set("If-Modified-Since", meta.lastModified);

        const res = await fetch(PRODUCTS_API, {
          method: "GET",
          mode: "cors",
          credentials: "omit",
          headers,
        });

        if (res.status === 304) {
          writeCachedProducts(cached.data, {
            fetchedAt: Date.now(),
          });
          if (isMountedRef.current) {
            setLoading(false);
            setRefreshBusy(false);
            setRefreshVisible(false);
          }
          return;
        }

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          const msg = `Fetch error ${res.status}${text ? `: ${text}` : ""}`;
          if (cached && cached.data) {
            if (isMountedRef.current) {
              setLoading(false);
              setRefreshBusy(false);
              setRefreshVisible(!userDismissed);
            }
            return;
          }
          throw new Error(msg);
        }

        const data = await res.json();

        let responseText = null;
        try {
          responseText = JSON.stringify(data);
        } catch (err) {
          responseText = null;
        }
        const responseHash = responseText ? simpleHash(responseText) : null;

        const newEtag = res.headers.get("ETag") || null;
        const lastModified = res.headers.get("Last-Modified") || null;

        const prevHash = cached?.meta?.hash || null;
        const prevEtag = cached?.meta?.etag || null;

        const isSameByEtag = newEtag && prevEtag && newEtag === prevEtag;
        const isSameByHash = prevHash && responseHash && prevHash === responseHash;

        if (isSameByEtag || isSameByHash) {
          writeCachedProducts(cached ? cached.data : data, {
            etag: newEtag,
            lastModified,
            hash: responseHash || prevHash || null,
            fetchedAt: Date.now(),
          });
          if (isMountedRef.current) {
            setLoading(false);
            setRefreshBusy(false);
            setRefreshVisible(false);
          }
          return;
        }

        const rows = extractProducts(data);
        const uniqueRows = dedupeByKey(rows);

        if (isMountedRef.current) {
          setRaw(uniqueRows);
          setProducts(uniqueRows);
        }

        const processed = processFilters(uniqueRows);
        if (isMountedRef.current) {
          setFilters({
            brands: processed.brands,
            kgs: processed.kgs,
            tags: processed.tags,
            minPrice: processed.minPrice,
            maxPrice: processed.maxPrice,
          });

          setCurrentFilter((c) => ({ ...c, maxPrice: processed.maxPrice }));
        }

        writeCachedProducts(data, {
          etag: newEtag,
          lastModified,
          hash: responseHash,
          fetchedAt: Date.now(),
        });

        if (isMountedRef.current) {
          setRefreshVisible(false);
          setUserDismissed(false);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err.message || "Failed to fetch products");
        }
        const cached = readCachedProducts();
        if (cached && cached.data) {
          const rows = extractProducts(cached.data);
          const uniqueRows = dedupeByKey(rows);
          if (isMountedRef.current) {
            setRaw(uniqueRows);
            setProducts(uniqueRows);
            setRefreshVisible(!userDismissed);
          }
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshBusy(false);
        }
      }
    },
    [extractProducts, dedupeByKey, processFilters, userDismissed]
  );

  useEffect(() => {
    fetchProducts({ useTTLMs: DEFAULT_CACHE_TTL_MS, force: false });
  }, [fetchProducts]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const brandParam = params.get("brand");
    const categoryParam = params.get("category");

    if (brandParam) {
      const brandValue = decodeURIComponent(brandParam).trim();
      setCurrentFilter((c) => {
        if (String(c.brand) === String(brandValue)) return c;
        return { ...c, brand: brandValue };
      });
    } else {
      setCurrentFilter((c) => (c.brand ? { ...c, brand: null } : c));
    }

    if (categoryParam) {
      const catValue = decodeURIComponent(categoryParam).trim();
      setSelectedCategory((prev) => {
        if (String(prev) === String(catValue)) return prev;
        return catValue;
      });

      setCurrentFilter((c) => {
        const existingTags = Array.isArray(c.tags) ? c.tags : [];
        const normalized = String(catValue);
        if (existingTags.length === 0) {
          return { ...c, tags: [normalized] };
        }
        if (existingTags.some((t) => String(t).trim().toLowerCase() === normalized.toLowerCase())) {
          return c;
        }
        return c;
      });
    } else {
      setSelectedCategory((prev) => {
        if (!prev) return prev;
        const tags = currentFilterRef.current.tags || [];
        if (tags.some((t) => String(t).trim().toLowerCase() === String(prev).trim().toLowerCase())) {
          return prev;
        }
        return null;
      });
    }
  }, [location.search]);

  useEffect(() => {
    const q = (searchQuery || "").trim().toLowerCase();

    const filtered = raw.filter((p) => {
      const pPrice = Number(p.offer_price ?? p.price ?? 0);

      if (currentFilter.priceRanges?.length > 0) {
        const matchesRange = currentFilter.priceRanges.some((rangeLabel) => {
          const range = priceRanges.find((r) => r.label === rangeLabel);
          if (!range) return false;
          return pPrice >= range.min && (range.max === Infinity ? pPrice >= range.min : pPrice < range.max);
        });
        if (!matchesRange) return false;
      }

      if (pPrice > (currentFilter.maxPrice ?? Number.POSITIVE_INFINITY)) return false;

      const pBrand = p.brand ?? p.manufacturer ?? p.mfg ?? p.vendor ?? "";
      if (currentFilter.brand) {
        if (String(pBrand).trim().toLowerCase() !== String(currentFilter.brand).trim().toLowerCase()) return false;
      }

      if (currentFilter.kgs) {
        const pWeight = p.weight ?? p.weight_text ?? p.unit ?? "";
        if (!pWeight || String(pWeight) !== String(currentFilter.kgs)) return false;
      }

      if (currentFilter.tags?.length > 0) {
        const pCategories = new Set();
        const catCandidates = [p.category, p.categories, p.category_name, p.cat, p.group];
        catCandidates.forEach((c) => {
          if (!c) return;
          if (typeof c === "string") pCategories.add(c.trim());
          else if (Array.isArray(c)) {
            c.forEach((x) => {
              if (typeof x === "string") pCategories.add(x.trim());
              else if (x?.name) pCategories.add(String(x.name).trim());
            });
          } else if (typeof c === "object" && c?.name) {
            pCategories.add(String(c.name).trim());
          }
        });

        const pTags = cleanTags(p.tags, p.tags_array);
        const anyMatch = currentFilter.tags.some((t) => {
          return pCategories.has(t) || (Array.isArray(pTags) && pTags.includes(t));
        });

        if (!anyMatch) return false;
      }

      if (selectedCategory) {
        const pCategories = new Set();
        const catCandidates = [p.category, p.categories, p.category_name, p.cat, p.group];
        catCandidates.forEach((c) => {
          if (!c) return;
          if (typeof c === "string") pCategories.add(c.trim());
          else if (Array.isArray(c)) {
            c.forEach((x) => {
              if (typeof x === "string") pCategories.add(x.trim());
              else if (x?.name) pCategories.add(String(x.name).trim());
            });
          } else if (typeof c === "object" && c?.name) {
            pCategories.add(String(c.name).trim());
          }
        });

        const pTags = cleanTags(p.tags, p.tags_array);
        if (!(pCategories.has(selectedCategory) || (Array.isArray(pTags) && pTags.includes(selectedCategory)))) return false;
      }

      if (q) {
        const pTags = cleanTags(p.tags, p.tags_array);
        const hay = [
          p.title,
          p.description,
          p.brand,
          p.sku,
          p.slug,
          p.weight,
          ...(Array.isArray(pTags) ? pTags : []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!hay.includes(q)) return false;
      }

      return true;
    });

    setProducts(filtered);
  }, [currentFilter, raw, priceRanges, searchQuery, selectedCategory]);

  const addToCart = useCallback((product) => {
    if (!product) return;
    const activeVal = product.active ?? product.stock ?? "";
    const isActive =
      (typeof activeVal === "string" && activeVal.toLowerCase() === "active") ||
      (typeof activeVal === "number" && activeVal > 0) ||
      activeVal === true;

    if (!isActive) return;

    setCart((prev) => {
      const foundIndex = prev.findIndex((i) => (i.id ?? i.title) === (product.id ?? product.title));
      if (foundIndex > -1) {
        const newCart = [...prev];
        newCart[foundIndex] = { ...newCart[foundIndex], qty: (newCart[foundIndex].qty ?? 0) + 1 };
        return newCart;
      }
      return [{ ...product, qty: 1 }, ...prev];
    });
  }, []);

  const removeOne = useCallback((product) => {
    setCart((prev) => {
      const foundIndex = prev.findIndex((i) => (i.id ?? i.title) === (product.id ?? product.title));
      if (foundIndex === -1) return prev;
      const newCart = [...prev];
      if ((newCart[foundIndex].qty ?? 0) <= 1) {
        newCart.splice(foundIndex, 1);
        return newCart;
      }
      newCart[foundIndex] = { ...newCart[foundIndex], qty: (newCart[foundIndex].qty ?? 0) - 1 };
      return newCart;
    });
  }, []);

  const removeAll = useCallback((product) => {
    setCart((prev) => prev.filter((i) => (i.id ?? i.title) !== (product.id ?? product.title)));
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem("cart", JSON.stringify(cart));
    } catch (e) {}
  }, [cart]);

  const cartQtyMap = useMemo(() => {
    const map = new Map();
    cart.forEach((i) => map.set(i.id ?? i.title, i.qty));
    return map;
  }, [cart]);

  const totalCartItems = useMemo(() => cart.reduce((s, i) => s + (i.qty ?? 0), 0), [cart]);

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory(null);
    setCurrentFilter({
      brand: null,
      kgs: null,
      maxPrice: filters.maxPrice ?? 999999,
      priceRanges: [],
      tags: [],
    });
    const params = new URLSearchParams(location.search || "");
    let changed = false;
    if (params.has("brand")) {
      params.delete("brand");
      changed = true;
    }
    if (params.has("category")) {
      params.delete("category");
      changed = true;
    }
    if (changed) {
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
  }, [filters.maxPrice, location.search, navigate, location.pathname]);

  const handleCheckout = useCallback(() => {
    try {
      const cartCopy = JSON.parse(JSON.stringify(cart));
      sessionStorage.setItem("cart", JSON.stringify(cartCopy));
      setCookie("rice_cart", JSON.stringify(cartCopy), 1);
      navigate("/checkout", { state: { cart: cartCopy } });
    } catch (err) {
      setError("Failed to prepare checkout. Please try again.");
    }
  }, [cart, navigate]);

  const SCROLL_THRESHOLD = 0.3;
  const scrollListenerRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      try {
        const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, document.documentElement.clientHeight);
        const winH = window.innerHeight || document.documentElement.clientHeight || 0;
        const scrollable = Math.max(docHeight - winH, 1);
        const percent = scrollTop / scrollable;
        if (percent >= SCROLL_THRESHOLD) {
          if (!userDismissed) setRefreshVisible(true);
        } else {
          if (!selectedProduct) setRefreshVisible(false);
        }
      } catch (e) {}
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    scrollListenerRef.current = onScroll;
    return () => {
      window.removeEventListener("scroll", onScroll);
      scrollListenerRef.current = null;
    };
  }, [userDismissed, selectedProduct]);

  useEffect(() => {
    if (selectedProduct) {
      setRefreshVisible(true);
      setUserDismissed(false);
    } else {
      if (scrollListenerRef.current) scrollListenerRef.current();
    }
  }, [selectedProduct]);

  const handleManualRefresh = useCallback(async () => {
    if (!isMountedRef.current) return;
    invalidateCache();
    try {
      sessionStorage.removeItem("cart");
    } catch (e) {}
    setCart([]);
    setRefreshBusy(true);
    setRefreshVisible(false);
    setUserDismissed(true);
    try {
      await fetchProducts({ force: true, useTTLMs: DEFAULT_CACHE_TTL_MS });
    } finally {
      setRefreshBusy(false);
    }
  }, [fetchProducts]);

  const toggleFilter = useCallback(() => {
    setFilterOpen((prev) => {
      const newOpen = !prev;
      if (!newOpen) {
        setTimeout(() => {
          filterBtnRef.current?.focus();
        }, 0);
      }
      return newOpen;
    });
  }, []);

  const handleFilterClose = useCallback(() => {
    setFilterOpen(false);
    setTimeout(() => {
      filterBtnRef.current?.focus();
    }, 0);
  }, []);

  const cardClickHandler = useCallback((p) => (e) => {
    const interactive = e.target.closest && e.target.closest("button, a, input, select, textarea, [role='button']");
    if (interactive) return;
    setSelectedProduct(p);
  }, []);

  const cardKeyDownHandler = useCallback((p) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedProduct(p);
    }
  }, []);

  return (
    <div className="page products-page-wrapper">
      <div className="page-head-wrapper">
        <div className="page-head">
          <div className="filterBtn">
            <button
              ref={filterBtnRef}
              type="button"
              className="btn filter-btn"
              onClick={toggleFilter}
              aria-expanded={filterOpen}
              title="Toggle filters"
            >
              <i className="filter-icon">
                <FaFilter />
              </i>
            </button>
          </div>

          <div style={{ marginTop: 12, width: "100%" }}>
            <Search
              tags={filters.tags}
              tagsApi={PRODUCTS_API}
              onSearch={(q) => {
                setSearchQuery(q);
                setCurrentFilter((c) => ({ ...c, search: q }));
              }}
              onSelectTag={(tag) => {
                setSelectedCategory(tag);
                setCurrentFilter((c) => ({ ...c, tags: tag ? [tag] : [] }));
              }}
              placeholder="Search rice, brand, weight"
              debounceMs={300}
            />
          </div>

          <div className="Date-card">{(() => {
            const meta = readLocalJSON(CACHE_META_KEY);
            return meta?.fetchedAt ? `Updated: ${new Date(meta.fetchedAt).toLocaleString()}` : "";
          })()}</div>
        </div>

        <div className="page-head-1">
          {loading && (
            <div className="cards-parent" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="card skeleton">
                  <div className="card-media skel-media" />
                  <div className="card-body">
                    <div className="skel-line medium" />
                    <div className="skel-line short" />
                    <div className="skel-line" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="error-box" role="alert" aria-live="assertive">
              <div className="error-title">Error: {error}</div>
              <div className="error-actions">
                <button type="button" className="btn primary" onClick={() => fetchProducts({ force: true })}>
                  Try again
                </button>
              </div>
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="no-products fade-in">
              <div className="no-products-content">
                <div className="no-products-icon bounce">
                  <svg xmlns="http://www.w3.org/2000/svg" className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18l-1.5 9H4.5L3 3zm0 0l2 14.5A2 2 0 007 19h10a2 2 0 002-1.5L21 3M10 21h4" />
                  </svg>
                </div>
                <h3 className="no-products-title">No products match your search</h3>
                <p className="no-products-text">We couldn’t find items for the filters you selected. Try broadening your search or reset filters to see everything.</p>
                <div className="no-products-actions">
                  <button type="button" className="reset-btn" onClick={resetFilters}>
                    <TfiReload /> Try Reset Filters
                  </button>
                  <button type="button" className="btn" onClick={() => fetchProducts({ force: true })}>
                    Reload
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && products.length > 0 && (
            <div className="products-section-wrapper" style={{ marginTop: 12 }}>
              <div className="cards-parent">
                {products.map((p) => {
                  const stableKey = p._key ?? computeStableKey(p);
                  return (
                    <div
                      key={stableKey}
                      role="button"
                      tabIndex={0}
                      className="card-click-wrapper"
                      onClick={cardClickHandler(p)}
                      onKeyDown={cardKeyDownHandler(p)}
                      aria-label={`Open details for ${p.title || "product"}`}
                    >
                      <Cards
                        product={p}
                        onAdd={addToCart}
                        onRemove={removeOne}
                        qty={cartQtyMap.get(p.id ?? p.title) ?? 0}
                        onOpenDetails={() => setSelectedProduct(p)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <FilterPanel open={filterOpen} onClose={handleFilterClose} filters={filters} current={currentFilter} setCurrent={setCurrentFilter} onReset={resetFilters} />

      {cart.length > 0 && (
        <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} items={cart} onInc={addToCart} onDec={removeOne} onRemove={removeAll} onCheckout={handleCheckout} />
      )}

      {totalCartItems > 0 && (
        <button type="button" className="cart-badge-btn" onClick={() => setDrawerOpen(true)} aria-label="Open cart">
          <i className="cart-icon">
            <FaShoppingCart />
          </i>
          {totalCartItems > 0 && <span className="badge" aria-hidden="false">{totalCartItems}</span>}
        </button>
      )}

      <ProductDetailsOverlay
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAdd={addToCart}
        onRemove={removeOne}
        qty={cartQtyMap.get(selectedProduct?.id ?? selectedProduct?.title) ?? 0}
      />

      <RefreshBtn visible={refreshVisible} delayMs={220} busy={refreshBusy || loading} onRefresh={handleManualRefresh} />
    </div>
  );
}
