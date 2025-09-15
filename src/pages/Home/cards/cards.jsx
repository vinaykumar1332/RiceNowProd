import React, { useEffect, useRef, useState } from "react";
import "./cards.css";

function cleanTags(tags, tags_array) {
  // tags might be a pipe string or already an array; handle stray quotes
  if (Array.isArray(tags_array)) {
    return tags_array.map((t) => String(t).replace(/(^"|"$)/g, "").trim()).filter(Boolean);
  }
  if (typeof tags === "string") {
    return tags
      .split("|")
      .map((t) => String(t).replace(/(^"|"$)/g, "").trim())
      .filter(Boolean);
  }
  return [];
}

export default function Cards({ product }) {
  // normalize fields
  const {
    title,
    description,
    category,
    subCategory,
    price,
    offer_price,
    images,
    image,
    tags,
    tags_array,
    brand,
    weights,
    weight,
    stock,
    cancel_reason,
  } = product || {};

  // produce images array (try multiple possible fields)
  const imgs = Array.isArray(images) && images.length > 0
    ? images
    : image
    ? [image]
    : [];

  // as last fallback, try fields like product.images_csv or similar
  // ensure all URLs are strings and trimmed
  const imageList = imgs.map((u) => String(u || "").trim()).filter(Boolean);

  const tagList = cleanTags(tags, tags_array);

  // image scroller logic
  const scrollerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // update activeIndex based on scroll position
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const children = Array.from(el.children);
      if (!children.length) {
        setActiveIndex(0);
        return;
      }
      // find child whose center is closest to container center
      const containerRect = el.getBoundingClientRect();
      const containerCenterX = containerRect.left + containerRect.width / 2;

      let bestIndex = 0;
      let bestDist = Infinity;
      children.forEach((child, idx) => {
        const r = child.getBoundingClientRect();
        const childCenter = r.left + r.width / 2;
        const dist = Math.abs(containerCenterX - childCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = idx;
        }
      });
      setActiveIndex(bestIndex);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    // initial calc
    onScroll();

    return () => el.removeEventListener("scroll", onScroll);
  }, [imageList.length]);

  const scrollToIndex = (i) => {
    const el = scrollerRef.current;
    const child = el?.children?.[i];
    if (child) {
      // smooth center alignment
      const rect = child.getBoundingClientRect();
      const parentRect = el.getBoundingClientRect();
      const offset = rect.left - parentRect.left - (parentRect.width - rect.width) / 2;
      el.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    const idx = Math.max(0, activeIndex - 1);
    scrollToIndex(idx);
  };
  const handleNext = () => {
    const idx = Math.min(imageList.length - 1, activeIndex + 1);
    scrollToIndex(idx);
  };

  const formattedPrice = typeof price === "number" ? price : parseFloat(price) || null;
  const formattedOffer = typeof offer_price === "number" ? offer_price : parseFloat(offer_price) || null;

  return (
    <article className="card">
      <div className="card-media">
        {imageList.length > 0 ? (
          <div className="image-scroller-wrap">
            <button className="scroller-btn left" onClick={handlePrev} aria-label="Previous image">
              ‹
            </button>

            <div className="image-scroller" ref={scrollerRef} role="list">
              {imageList.map((src, idx) => (
                <div className="image-item" key={idx} role="listitem">
                  <img
                    src={src}
                    alt={`${title ?? "product"} ${idx + 1}`}
                    crossOrigin="anonymous"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src =
                        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='%23f0f0f0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='18'>Image not available</text></svg>";
                    }}
                  />
                </div>
              ))}
            </div>

            <button className="scroller-btn right" onClick={handleNext} aria-label="Next image">
              ›
            </button>

            <div className="image-dots" aria-hidden>
              {imageList.map((_, i) => (
                <button
                  key={i}
                  className={`dot ${i === activeIndex ? "active" : ""}`}
                  onClick={() => scrollToIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="image-placeholder">No image</div>
        )}
      </div>

      <div className="card-body">
        <h2 className="card-title">{title || "Untitled product"}</h2>
        <div className="meta-row">
          <span className="brand">{brand || "Unknown brand"}</span>
          <span className={`stock ${String(stock).toLowerCase() === "active" ? "in" : "out"}`}>
            {String(stock || "unknown").toUpperCase()}
          </span>
        </div>

        <p className="desc">{description || "No description provided."}</p>

        <div className="price-row">
          {formattedOffer ? (
            <>
              <span className="offer">₹{formattedOffer.toFixed(2)}</span>
              {formattedPrice && formattedPrice !== formattedOffer && (
                <span className="orig">₹{formattedPrice.toFixed(2)}</span>
              )}
            </>
          ) : formattedPrice ? (
            <span className="offer">₹{formattedPrice.toFixed(2)}</span>
          ) : (
            <span className="offer">Price N/A</span>
          )}
        </div>

        <div className="info-row">
          <div className="category">
            <strong>Category:</strong> {category || "—"} {subCategory ? ` / ${subCategory}` : ""}
          </div>
          <div className="weight">
            <strong>Weight:</strong> {weight || (Array.isArray(weights) ? weights.join(", ") : "—")}
          </div>
        </div>

        {tagList.length > 0 && (
          <div className="tags">
            {tagList.map((t, i) => (
              <span key={i} className="tag">
                {t}
              </span>
            ))}
          </div>
        )}

        {cancel_reason ? <div className="cancel-reason">Cancel: {cancel_reason}</div> : null}
      </div>
    </article>
  );
}
