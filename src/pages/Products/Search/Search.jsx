import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import PropTypes from "prop-types";
import "./Search.css";
import { BsSearchHeart } from "react-icons/bs";

function safeCssEscape(str) {
  try {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(String(str));
    }
  } catch (e) {
    // fall through to fallback
  }
  return String(str).replace(/(["'\\])/g, "\\$1");
}

const TagButton = React.memo(function TagButton({ tag, active, onClick, idx }) {
  return (
    <button
      key={`${String(tag)}-${idx}`}
      className={`chip ${active ? "active" : ""}`}
      onClick={() => onClick(tag)}
      type="button"
      aria-pressed={active}
      data-tag={tag}
      title={String(tag)}
    >
      {tag}
    </button>
  );
});

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

  const timerRef = useRef(null);
  const scrollerRef = useRef(null);
  const inputRef = useRef(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    if (Array.isArray(tags)) {
      setInternalTags((prev) => {
        const set = new Set(tags.filter(Boolean).map(String));
        const prevSet = new Set((prev || []).map(String));
        if (set.size === prevSet.size && [...set].every((s) => prevSet.has(s))) {
          return prev;
        }
        return [...set];
      });
    }
  }, [tags]);

  useEffect(() => {
    mountedRef.current = true;
    if ((!Array.isArray(tags) || tags.length === 0) && tagsApi) {
      setLoadingTags(true);
      setErrorTags(null);
      const ac = new AbortController();
      (async () => {
        try {
          const res = await fetch(tagsApi, {
            method: "GET",
            mode: "cors",
            headers: { Accept: "application/json" },
            signal: ac.signal,
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`Failed to load tags: ${res.status} ${text}`);
          }
          const data = await res.json();

          // accept many shapes
          let out = [];
          if (Array.isArray(data)) out = data;
          else if (Array.isArray(data?.tags)) out = data.tags;
          else if (Array.isArray(data?.rows)) out = data.rows;
          else if (Array.isArray(data?.data)) out = data.data;
          else if (Array.isArray(data?.items)) out = data.items;
          else if (Array.isArray(data?.categories)) out = data.categories;
          else if (typeof data === "object") {
            // if it's an object of primitives
            out = Object.values(data).filter((v) => typeof v === "string");
          }
          const normalized = out
            .map((t) =>
              typeof t === "string"
                ? t
                : t?.name ?? t?.tag ?? t?.label ?? t?.category ?? t?.title ?? String(t)
            )
            .filter(Boolean)
            .map(String);

          // de-dupe while preserving order
          const seen = new Set();
          const deduped = [];
          for (const item of normalized) {
            if (!seen.has(item)) {
              seen.add(item);
              deduped.push(item);
            }
          }

          if (mountedRef.current) {
            // preserve input caret & focus across this update to avoid blinking
            const input = inputRef.current;
            let selStart = null;
            let selEnd = null;
            const hadFocus = input === document.activeElement;
            if (input && hadFocus) {
              try {
                selStart = input.selectionStart;
                selEnd = input.selectionEnd;
              } catch (e) {
                selStart = selEnd = null;
              }
            }

            setInternalTags(deduped);

            // restore focus & selection in next animation frame
            if (input && hadFocus) {
              requestAnimationFrame(() => {
                try {
                  input.focus();
                  if (selStart != null && selEnd != null) {
                    input.setSelectionRange(selStart, selEnd);
                  }
                } catch (e) {
                  // ignore
                }
              });
            }
          }
        } catch (err) {
          if (!ac.signal.aborted) {
            console.error(err);
            if (mountedRef.current) setErrorTags(err.message || "Failed to fetch tags");
          }
        } finally {
          if (mountedRef.current) setLoadingTags(false);
        }
      })();

      return () => {
        ac.abort();
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsApi]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Debounced search emitter
  const triggerSearch = useCallback(
    (q) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          onSearch?.(q || "");
        } catch (e) {
          // swallow
        }
      }, debounceMs);
    },
    [onSearch, debounceMs]
  );

  useEffect(() => {
    triggerSearch(query);
  }, [query, triggerSearch]);

  // Tag click: toggle or clear
  const handleTagClick = useCallback(
    (tag) => {
      const newTag = tag === selectedTag ? null : tag;
      setSelectedTag(newTag);
      try {
        onSelectTag?.(newTag);
      } catch (e) {
        // swallow
      }

      // Scroll clicked item into view for usability
      try {
        const sc = scrollerRef.current;
        if (!sc) return;
        const selector = `[data-tag="${safeCssEscape(tag ?? "__all__")}"]`;
        const el = sc.querySelector(`[data-tag="${tag ?? "__all__"}"]`) || sc.querySelector(selector);
        if (el) {
          const scrollerRect = sc.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          if (elRect.left < scrollerRect.left || elRect.right > scrollerRect.right) {
            el.scrollIntoView({ behavior: "smooth", inline: "center" });
          }
        }
      } catch (e) {
        // ignore scroll errors
      }
    },
    [onSelectTag, selectedTag]
  );

  const allChipActive = selectedTag === null;
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
            ref={inputRef}
            className="search-input"
            placeholder={placeholder || "Search rice, brands, weights"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search products"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              className="search-clear"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                // keep focus so clearing doesn't cause blink
                try {
                  inputRef.current?.focus();
                } catch (e) {}
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="tags-scroller-container">
        <div
          className="tags-row"
          ref={scrollerRef}
          role="list"
          aria-label="Product categories"
        >
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
                <div key={`skeleton-${idx}`} className="chip skeleton-chip" aria-hidden />
              ))}
            </>
          )}

          {errorTags && <div className="small-muted tags-error">Failed to load categories</div>}

          {!loadingTags && tagList.length > 0 && (
            <>
              {tagList.map((t, idx) => (
                <TagButton
                  key={`${String(t)}-${idx}`}
                  tag={t}
                  active={selectedTag === t}
                  onClick={handleTagClick}
                  idx={idx}
                />
              ))}
            </>
          )}

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
