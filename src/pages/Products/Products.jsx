import React, { useEffect, useState, useMemo } from "react";
import PropTypes from 'prop-types';
import Cards from "./cards/cards"; // Adjust path if needed
import "./Products.css";
import { VITE_PRODUCTS_API } from "../../API"; // Adjust path if needed
import { cleanTags } from "../../utils/helpers"; // Adjust path if needed

const PRODUCTS_API = VITE_PRODUCTS_API;

/* ---------- CartDrawer (unchanged behavior) ---------- */
function CartDrawer({ open, onClose, items, onInc, onDec, onRemove }) {
  const total = useMemo(() => items.reduce((s, i) => s + (Number(i.offer_price ?? i.price ?? 0) * i.qty), 0), [items]);
  return (
    <aside className={`cart-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="cart-header">
        <h3>Your Cart</h3>
        <button className="drawer-close" onClick={onClose} aria-label="Close cart">✕</button>
      </div>
      <div className="cart-body">
        {items.length === 0 ? (
          <div className="cart-empty">No items added</div>
        ) : (
          items.map((it) => (
            <div className="cart-item" key={it.id ?? it.title}>
              <div className="cart-item-left">
                <div
                  className="cart-thumb"
                  style={{ backgroundImage: `url(${(it.images && it.images[0]) || it.image || ""})` }}
                />
                <div>
                  <div className="cart-title">{it.title}</div>
                  <div className="cart-meta">₹{Number(it.offer_price ?? it.price ?? 0).toFixed(2)} |{it.weight || "—"} | Qty: {it.qty}</div>
                </div>
              </div>
              <div className="cart-actions">
                <button onClick={() => onDec(it)} aria-label="decrease">−</button>
                <span>{it.qty}</span>
                <button onClick={() => onInc(it)} aria-label="increase">+</button>
                <button className="remove" onClick={() => onRemove(it)} aria-label="remove">
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="cart-footer">
        <div className="cart-total">
          Total: <strong>₹{total.toFixed(2)}</strong>
        </div>
        <div className="cart-actions-row">
          <button className="btn primary">Checkout</button>
          <button className="btn" onClick={onClose}>Close</button>
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
};

/* ---------- FilterPanel updated to match your request ----------
   - Brand: radio buttons (single select)
   - Category: tags (chips, multi-select)
   - Price ranges: checkboxes (same as before)
   - Kgs: radio buttons (single select) */
function FilterPanel({ open, onClose, filters, current, setCurrent, onReset }) {
  const priceRanges = useMemo(() => [
    { label: "Under ₹100", min: 0, max: 100 },
    { label: "₹100 - ₹500", min: 100, max: 500 },
    { label: "₹500 - ₹1000", min: 500, max: 1000 },
    { label: "Over ₹1000", min: 1000, max: Infinity },
  ], []);

  const brands = useMemo(() => Array.from(filters.brands || []), [filters.brands]);
  const kgOptions = useMemo(() => Array.from(filters.kgs || []), [filters.kgs]); // e.g. "250g", "500g", "1kg"

  return (
    <div className={`filter-panel ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="filter-head">
        <h3>Filters</h3>
        <button className="drawer-close" onClick={onClose}>✕</button>
      </div>

      <div className="filter-body">
        <section className="filter-section-brand">
          <h4>Brand</h4>
          <div className="brand-radios">
            <label>
              <input
                type="radio"
                name="brand"
                value=""
                checked={!current.brand}
                onChange={() => setCurrent((c) => ({ ...c, brand: null }))}
              />
              All
            </label>
            {brands.map((b) => (
              <label key={b}>
                <input
                  type="radio"
                  name="brand"
                  value={b}
                  checked={String(current.brand) === String(b)}
                  onChange={() => setCurrent((c) => ({ ...c, brand: b }))}
                />
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
                key={tag}
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
              >
                {tag}
              </button>
            ))}
            {(filters.tags || []).length === 0 && (<div className="small-muted">No categories found</div>)}
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
              <input
                type="radio"
                name="kgs"
                value=""
                checked={!current.kgs}
                onChange={() => setCurrent((c) => ({ ...c, kgs: null }))}
              />
              All
            </label>
            {kgOptions.map((k) => (
              <label key={k}>
                <input
                  type="radio"
                  name="kgs"
                  value={k}
                  checked={String(current.kgs) === String(k)}
                  onChange={() => setCurrent((c) => ({ ...c, kgs: k }))}
                />
                {k}
              </label>
            ))}
            {kgOptions.length === 0 && <div className="small-muted">No weight info</div>}
          </div>
        </section>

        <div className="filter-actions">
          <button className="btn primary" onClick={onClose}>Apply</button>
          <button className="btn" onClick={onReset} style={{ marginLeft: 8 }}>Reset</button>
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

/* ---------- ProductDetailsOverlay (unchanged except safe displays) ---------- */
function ProductDetailsOverlay({ product, onClose, onAdd, onRemove, qty }) {
  if (!product) return null;
  const { title, description, price, offer_price, images, image, weight, tags, tags_array, brand } = product;
  const imageList = useMemo(() => Array.isArray(images) && images.length ? images : image ? [image] : [], [images, image]);
  const tagList = useMemo(() => cleanTags(tags, tags_array), [tags, tags_array]);
  return (
    <div className="details-overlay open" onClick={onClose}>
      <div className="details-content" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose}>✕</button>
        {imageList[0] && <img src={imageList[0]} alt={title} className="details-image" />}
        <h2>{title}</h2>
        {brand && <p><strong>Brand:</strong> {brand}</p>}
        <p>{description}</p>
        <p><strong>Price:</strong> ₹{offer_price ?? price}</p>
        <p> {weight}</p>
        <div className="tags">
          {tagList.map((t, i) => <span key={i} className="tag">{t}</span>)}
        </div>
        <div className="qty-controls">
          {qty > 0 ? (
            <>
              <button onClick={() => onRemove(product)}>−</button>
              <span>{qty}</span>
              <button onClick={() => onAdd(product)}>+</button>
            </>
          ) : (
            <button onClick={() => onAdd(product)}>＋ Add</button>
          )}
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

/* ---------- Main Products component (updated filtering model) ---------- */
export default function Products() {
  const [products, setProducts] = useState([]);
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
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
    brand: null,        // single brand radio
    kgs: null,          // single kgs radio
    maxPrice: 100000,
    priceRanges: [],    // array of range labels
    tags: [],           // multi-select (acts as category)
  });
  const [selectedProduct, setSelectedProduct] = useState(null);

  const priceRanges = useMemo(() => [
    { label: "Under ₹100", min: 0, max: 100 },
    { label: "₹100 - ₹500", min: 100, max: 500 },
    { label: "₹500 - ₹1000", min: 500, max: 1000 },
    { label: "Over ₹1000", min: 1000, max: Infinity },
  ], []);

  const extractProducts = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.products)) return data.products;
    if (Array.isArray(data?.rows)) return data.rows;
    if (Array.isArray(data?.data)) return data.data;
    console.warn("Unexpected data shape from products API", data);
    return [];
  };

  // Build brands & weights & tags sets from rows
  const processFilters = (rows) => {
    const brands = new Set();
    const kgs = new Set();
    const tagsSet = new Set();
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    rows.forEach((r) => {
      // common brand keys: brand, manufacturer, mfg, vendor - try them
      const brand = r.brand ?? r.manufacturer ?? r.mfg ?? r.vendor ?? null;
      if (brand) brands.add(String(brand).trim());

      // weight: keep raw string if present (normalization could be done as needed)
      const w = r.weight ?? r.weight_text ?? r.unit ?? null;
      if (w) {
        const ws = String(w).trim();
        if (ws) kgs.add(ws);
      }

      cleanTags(r.tags, r.tags_array).forEach(t => tagsSet.add(t));

      const p = Number(r.offer_price ?? r.price ?? 0);
      if (!Number.isNaN(p)) {
        min = Math.min(min, p);
        max = Math.max(max, p);
      }
    });

    return {
      brands,
      kgs,
      tags: [...tagsSet],
      minPrice: Number.isFinite(min) ? Math.floor(min) : 0,
      maxPrice: Number.isFinite(max) ? Math.ceil(max) : 0,
    };
  };

  const fetchProducts = () => {
    setLoading(true);
    setError(null);
    if (!PRODUCTS_API) {
      setError("Products API not configured.");
      setLoading(false);
      return;
    }
    fetch(PRODUCTS_API, { method: "GET", mode: "cors", headers: { Accept: "application/json" }, credentials: "omit" })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Fetch error ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then((data) => {
        const rows = extractProducts(data);
        setRaw(rows);
        setProducts(rows);

        const processed = processFilters(rows);
        setFilters({
          brands: processed.brands,
          kgs: processed.kgs,
          tags: processed.tags,
          minPrice: processed.minPrice,
          maxPrice: processed.maxPrice,
        });

        // set sensible defaults for current filter
        setCurrentFilter((c) => ({ ...c, maxPrice: processed.maxPrice }));
      })
      .catch((err) => {
        console.error("Failed to fetch products", err);
        setError(err.message || "Failed to fetch products");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, []);

  // Filtering effect: apply brand, price ranges, maxPrice, tags (category), and kgs
  useEffect(() => {
    const filtered = raw.filter((p) => {
      const pPrice = Number(p.offer_price ?? p.price ?? 0);

      // price range match if any selected
      if (currentFilter.priceRanges?.length > 0) {
        const matchesRange = currentFilter.priceRanges.some(rangeLabel => {
          const range = priceRanges.find(r => r.label === rangeLabel);
          if (!range) return false;
          return pPrice >= range.min && (range.max === Infinity ? pPrice >= range.min : pPrice < range.max);
        });
        if (!matchesRange) return false;
      }

      // max price cutoff
      if (pPrice > (currentFilter.maxPrice ?? Number.POSITIVE_INFINITY)) return false;

      // brand radio (single)
      const pBrand = p.brand ?? p.manufacturer ?? p.mfg ?? p.vendor ?? null;
      if (currentFilter.brand && String(pBrand) !== String(currentFilter.brand)) return false;

      // kgs radio (single) - compare with weight string
      if (currentFilter.kgs) {
        const pWeight = p.weight ?? p.weight_text ?? p.unit ?? "";
        if (!pWeight || String(pWeight) !== String(currentFilter.kgs)) return false;
      }

      // tags (category) multi-select: product must contain at least one selected tag
      if (currentFilter.tags?.length > 0) {
        const pTags = cleanTags(p.tags, p.tags_array);
        if (!currentFilter.tags.some(t => pTags.includes(t))) return false;
      }

      return true;
    });

    setProducts(filtered);
  }, [currentFilter, raw, priceRanges]);

  /* ---------- Cart helpers (unchanged) ---------- */
  const addToCart = (product) => {
    if (!product) return;
    // treat product as active if property 'active' or 'stock' equals 'active' (string) OR stock numeric > 0
    const activeVal = (product.active ?? product.stock ?? "");
    const isActive = (typeof activeVal === "string" && activeVal.toLowerCase() === "active")
      || (typeof activeVal === "number" && activeVal > 0)
      || activeVal === true;
    if (!isActive) return;
    setCart((prev) => {
      const foundIndex = prev.findIndex((i) => (i.id ?? i.title) === (product.id ?? product.title));
      if (foundIndex > -1) {
        const newCart = [...prev];
        newCart[foundIndex] = { ...newCart[foundIndex], qty: newCart[foundIndex].qty + 1 };
        return newCart;
      }
      return [{ ...product, qty: 1 }, ...prev];
    });
  };

  const removeOne = (product) => {
    setCart((prev) => {
      const foundIndex = prev.findIndex((i) => (i.id ?? i.title) === (product.id ?? product.title));
      if (foundIndex === -1) return prev;
      const newCart = [...prev];
      if (newCart[foundIndex].qty <= 1) {
        newCart.splice(foundIndex, 1);
        return newCart;
      }
      newCart[foundIndex] = { ...newCart[foundIndex], qty: newCart[foundIndex].qty - 1 };
      return newCart;
    });
  };

  const removeAll = (product) => {
    setCart((prev) => prev.filter((i) => (i.id ?? i.title) !== (product.id ?? product.title)));
  };

  const cartQtyMap = useMemo(() => {
    const map = new Map();
    cart.forEach((i) => map.set(i.id ?? i.title, i.qty));
    return map;
  }, [cart]);

  const totalCartItems = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  const resetFilters = () => {
    setCurrentFilter({
      brand: null,
      kgs: null,
      maxPrice: filters.maxPrice ?? 999999,
      priceRanges: [],
      tags: [],
    });
  };

  /* ---------- Render ---------- */
  return (
    <div className="page products-page-wrapper" >
      <div className="page-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn filter-btn" onClick={() => setFilterOpen((f) => !f)} aria-expanded={filterOpen}>
            <i className="filter-icon">≡</i> Filters
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {loading && (
          <div className="cards-parent" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card skeleton">
                <div className="card-media skel-media"></div>
                <div className="card-body">
                  <div className="skel-line medium"></div>
                  <div className="skel-line short"></div>
                  <div className="skel-line"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: 16, background: "#fff6f6", borderRadius: 8 }}>
            <div style={{ color: "#b33", fontWeight: 700 }}>Error: {error}</div>
            <div style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={fetchProducts}>Try again</button>
            </div>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div style={{ padding: 16 }}>
            No products found. <button className="btn" onClick={resetFilters}>Reset filters</button>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="products-section-wrapper" style={{ marginTop: 12 }}>
            <div className="cards-parent">
              {products.map((p, idx) => (
                <Cards
                  key={p.id ?? p.title ?? idx}
                  product={p}
                  onAdd={addToCart}
                  onRemove={removeOne}
                  qty={cartQtyMap.get(p.id ?? p.title) ?? 0}
                  onOpenDetails={() => setSelectedProduct(p)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        current={currentFilter}
        setCurrent={setCurrentFilter}
        onReset={resetFilters}
      />

      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} items={cart} onInc={addToCart} onDec={removeOne} onRemove={removeAll} />

      <button className="cart-badge-btn" onClick={() => setDrawerOpen(true)} aria-label="Open cart">
        <i className="cart-icon">🛒</i>
        {totalCartItems > 0 && <span className="badge">{totalCartItems}</span>}
      </button>

      <ProductDetailsOverlay
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAdd={addToCart}
        onRemove={removeOne}
        qty={cartQtyMap.get(selectedProduct?.id ?? selectedProduct?.title) ?? 0}
      />
    </div>
  );
}
