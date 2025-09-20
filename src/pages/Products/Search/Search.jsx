import React, { useEffect, useState, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import "./Search.css";
import { BsSearchHeart } from "react-icons/bs";

export default function Search({
  tags,
  tagsApi,
  onSearch,
  onSelectTag,
  placeholder,
  debounceMs = 300,
  initialTag = null,
}) {
  const [query, setQuery] = useState("");
  const [internalTags, setInternalTags] = useState(Array.isArray(tags) ? tags : []);
  const [loadingTags, setLoadingTags] = useState(false);
  const [errorTags, setErrorTags] = useState(null);
  const [selectedTag, setSelectedTag] = useState(initialTag);
  const timer = useRef(null);
  const scrollerRef = useRef(null);

  // keep in sync when parent passes new tags/categories
  useEffect(() => {
    if (Array.isArray(tags)) setInternalTags(tags);
  }, [tags]);

  // Fetch tags/categories from tagsApi if none provided
  useEffect(() => {
    let mounted = true;
    if ((!Array.isArray(tags) || tags.length === 0) && tagsApi) {
      setLoadingTags(true);
      setErrorTags(null);
      fetch(tagsApi, { method: "GET", mode: "cors", headers: { Accept: "application/json" } })
        .then(async (res) => {
          if (!res.ok) {
            const t = await res.text();
            throw new Error(`Failed to load tags: ${res.status} ${t}`);
          }
          return res.json();
        })
        .then((data) => {
          // accept common shapes: array, data.tags, data.rows, data.categories, etc.
          let out = [];
          if (Array.isArray(data)) out = data;
          else if (Array.isArray(data.tags)) out = data.tags;
          else if (Array.isArray(data.rows)) out = data.rows;
          else if (Array.isArray(data.data)) out = data.data;
          else if (Array.isArray(data.items)) out = data.items;
          else if (Array.isArray(data.categories)) out = data.categories;

          // Normalize: accept objects with name/label/tag/category fields as strings
          out = out
            .map((t) =>
              typeof t === "string"
                ? t
                : t?.name ?? t?.tag ?? t?.label ?? t?.category ?? t?.title ?? String(t)
            )
            .filter(Boolean);

          if (mounted) setInternalTags(Array.from(new Set(out)));
        })
        .catch((err) => {
          console.error(err);
          if (mounted) setErrorTags(err.message || "Failed to fetch tags");
        })
        .finally(() => {
          if (mounted) setLoadingTags(false);
        });
    }
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsApi]);

  // Debounced search emitter
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onSearch?.(query || "");
    }, debounceMs);
    return () => clearTimeout(timer.current);
  }, [query, onSearch, debounceMs]);

  const handleTagClick = (tag) => {
    const newTag = tag === selectedTag ? null : tag;
    setSelectedTag(newTag);
    onSelectTag?.(newTag);
    // Scroll clicked item into view for usability
    try {
      const sc = scrollerRef.current;
      const el = sc?.querySelector(`[data-tag="${cssEscape(tag ?? "")}"]`);
      if (el && sc) {
        const scrollerRect = sc.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        if (elRect.left < scrollerRect.left || elRect.right > scrollerRect.right) {
          el.scrollIntoView({ behavior: "smooth", inline: "center" });
        }
      }
    } catch (e) {
      // ignore
    }
  };

  // helper to render "All" chip
  const allChipActive = selectedTag === null;

  // utility to safely escape attribute selectors
  function cssEscape(str) {
    return String(str).replace(/"/g, '\\"').replace(/'/g, "\\'");
  }

  const tagList = useMemo(() => internalTags || [], [internalTags]);

  return (
    <>
      <div className="search-wrapper">
        <div className="search-row">
          <label className="search-input-label" htmlFor="products-search" aria-hidden>
            <BsSearchHeart />
          </label>
          <input
            id="products-search"
            className="search-input"
            placeholder={placeholder || "Search rice, brands, weights"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search products"
          />
          {query && (
            <button
              className="search-clear"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="tags-scroller-container">
        <div className="tags-row" ref={scrollerRef} role="list" aria-label="Product categories">
          <button
            className={`chip ${allChipActive ? "active" : ""}`}
            onClick={() => handleTagClick(null)}
            type="button"
            aria-pressed={allChipActive}
            data-tag="__all__"
          >
            All
          </button>

          {loadingTags && (
            <>
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={`skeleton-${idx}`} className="chip skeleton-chip"></div>
              ))}
            </>
          )}

          {errorTags && <div className="small-muted tags-error">Failed to load categories</div>}

          {!loadingTags &&
            tagList.map((t, idx) => {
              const active = selectedTag === t;
              return (
                <button
                  key={`${String(t)}-${idx}`}
                  className={`chip ${active ? "active" : ""}`}
                  onClick={() => handleTagClick(t)}
                  type="button"
                  aria-pressed={active}
                  data-tag={t}
                  title={String(t)}
                >
                  {t}
                </button>
              );
            })}

          {!loadingTags && tagList.length === 0 && (
            <div className="small-muted tags-empty">No categories</div>
          )}
        </div>
      </div>
    </>
  );
}

Search.propTypes = {
  tags: PropTypes.arrayOf(PropTypes.string),
  tagsApi: PropTypes.string,
  onSearch: PropTypes.func,
  onSelectTag: PropTypes.func,
  placeholder: PropTypes.string,
  debounceMs: PropTypes.number,
  initialTag: PropTypes.string,
};