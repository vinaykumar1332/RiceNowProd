import React, { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import Image from "./Image"; // your existing Image wrapper
import "./ImageCarousel.css";
import { FaRegWindowClose } from "react-icons/fa";

const PLACEHOLDER = `data:image/svg+xml;utf8,
<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 24 24' fill='none' stroke='%23bbb' stroke-width='1.2'>
  <rect x='1' y='1' width='22' height='22' rx='2' />
  <path d='M4 14l4-4 4 4 6-6' />
</svg>`;

function isFullUrl(str) {
  return typeof str === "string" && /^(https?:\/\/|data:|blob:|\/\/)/i.test(String(str).trim());
}

export default function ImageCarousel({
  images = [],
  initialIndex = 0,
  title = "",
  thumbSize = 72,
  width = 680,      // fixed width (px) default
  height = 420,     // fixed height (px) default
  transitionMs = 420,
  onIndexChange = () => {},
}) {
  // state
  const [index, setIndex] = useState(() => {
    const i = Math.max(0, Math.min(initialIndex || 0, (images || []).length - 1));
    return Number.isFinite(i) ? i : 0;
  });
  const [loaded, setLoaded] = useState(() => (images || []).map(() => false));
  const [errored, setErrored] = useState(() => (images || []).map(() => false));

  // refs for dragging
  const mainRef = useRef(null);
  const thumbsRef = useRef(null);
  const touchStartX = useRef(null);
  const deltaX = useRef(0);
  const isPointerDown = useRef(false);

  // keep local copy if images updates
  useEffect(() => {
    setLoaded((_) => (images || []).map(() => false));
    setErrored((_) => (images || []).map(() => false));
    setIndex((i) => Math.min(i, Math.max(0, (images || []).length - 1)));
  }, [images]);

  // call back to parent when index changes
  useEffect(() => {
    onIndexChange(index);
    // scroll active thumb into view
    const activeThumb = thumbsRef.current?.querySelector(".ic-thumb-btn.active");
    if (activeThumb && typeof activeThumb.scrollIntoView === "function") {
      activeThumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [index, onIndexChange]);

  // handle pointer/touch drag
  const onPointerDown = (clientX) => {
    isPointerDown.current = true;
    touchStartX.current = clientX;
    deltaX.current = 0;
  };

  const onPointerMove = (clientX) => {
    if (!isPointerDown.current) return;
    deltaX.current = clientX - touchStartX.current;
    if (mainRef.current) {
      // small translate for feedback, but fade is the main effect
      mainRef.current.style.transform = `translateX(${deltaX.current}px)`;
    }
  };

  const onPointerUp = () => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    const threshold = Math.max(48, width * 0.06); // px threshold
    if (Math.abs(deltaX.current) > threshold) {
      if (deltaX.current > 0) {
        // dragged right -> previous
        setIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else {
        // dragged left -> next
        setIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    }
    // reset transform
    if (mainRef.current) mainRef.current.style.transform = "";
    deltaX.current = 0;
  };

  // pointer/mouse/touch handlers
  const handleTouchStart = (e) => {
    const clientX = (e.touches && e.touches[0] && e.touches[0].clientX) || (e.clientX) || 0;
    onPointerDown(clientX);
  };
  const handleTouchMove = (e) => {
    const clientX = (e.touches && e.touches[0] && e.touches[0].clientX) || (e.clientX) || 0;
    onPointerMove(clientX);
  };
  const handleTouchEnd = () => onPointerUp();

  const handleMouseDown = (e) => {
    e.preventDefault();
    onPointerDown(e.clientX);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp, { once: true });
  };
  const handleMouseMove = (e) => onPointerMove(e.clientX);
  const handleMouseUp = () => {
    onPointerUp();
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  // keyboard navigation (left/right)
  useEffect(() => {
    const kb = (ev) => {
      if (ev.key === "ArrowLeft") {
        setIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (ev.key === "ArrowRight") {
        setIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener("keydown", kb);
    return () => window.removeEventListener("keydown", kb);
  }, [images.length]);

  // img handlers
  const handleLoad = (i) => () => {
    setLoaded((prev) => {
      const arr = [...prev];
      arr[i] = true;
      return arr;
    });
  };
  const handleError = (i) => () => {
    setErrored((prev) => {
      const arr = [...prev];
      arr[i] = true;
      return arr;
    });
    setLoaded((prev) => {
      const arr = [...prev];
      arr[i] = true; // stop loader
      return arr;
    });
  };

  // click bullet/thumb
  const gotoIndex = (i) => {
    if (i === index) return;
    setIndex(i);
  };

  // computed
  const visibleCount = (images || []).length;
  const carouselStyle = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    "--ic-transition-ms": `${transitionMs}ms`,
  };

  return (
    <div className="ic-root">
      <div
        className="ic-viewport"
        style={carouselStyle}
        // main touch/mouse handlers
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        role="presentation"
        aria-label={`${title} product images carousel`}
      >
        {/* slides container: we use absolute slides with fade; mainRef used for drag translate feedback */}
        <div className="ic-slides" ref={mainRef}>
          {(images || []).map((img, i) => {
            const src = isFullUrl(img) ? img : null;
            const key = src ? `url-${src}-${i}` : `id-${String(img)}-${i}`;
            const isActive = i === index;
            return (
              <div
                key={key}
                className={`ic-slide ${isActive ? "ic-active" : "ic-inactive"}`}
                style={{ transitionDuration: `${transitionMs}ms` }}
                aria-hidden={!isActive}
                aria-label={`${title} image ${i + 1} of ${visibleCount}`}
              >
                {!loaded[i] && (
                  <div className="ic-loader">
                    <div className="ic-spinner" />
                  </div>
                )}

                {/* Use your Image component. If it doesn't forward onLoad/onError, replace with <img /> */}
                <Image
                  imageUrl={src}
                  imageId={src ? null : img}
                  alt={`${title} (${i + 1}/${visibleCount})`}
                  size={1000}
                  className="ic-image"
                  onLoad={handleLoad(i)}
                  onError={handleError(i)}
                />

                {errored[i] && (
                  <div className="ic-error">
                    <img src={PLACEHOLDER} alt="fallback" />
                    <div className="ic-error-text">Image not available</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* bullets */}
      <div className="ic-bullets" role="tablist" aria-label="Image bullets">
        {(images || []).map((_, i) => (
          <button
            key={`dot-${i}`}
            type="button"
            className={`ic-bullet ${i === index ? "active" : ""}`}
            aria-selected={i === index}
            aria-label={`Show image ${i + 1}`}
            onClick={() => gotoIndex(i)}
          />
        ))}
      </div>

      {/* thumbnails */}
      <div className="ic-thumbs-wrap">
        <div className="ic-thumbs" ref={thumbsRef} role="tablist" aria-label="Thumbnails">
          {(images || []).map((img, i) => {
            const src = isFullUrl(img) ? img : null;
            return (
              <button
                key={`thumb-${i}`}
                type="button"
                className={`ic-thumb-btn ${i === index ? "active" : ""}`}
                onClick={() => gotoIndex(i)}
                aria-selected={i === index}
                aria-label={`Show image ${i + 1}`}
              >
                <div className="ic-thumb-inner" style={{ width: thumbSize, height: thumbSize }}>
                  <Image
                    imageUrl={src}
                    imageId={src ? null : img}
                    alt={`${title} thumbnail ${i + 1}`}
                    size={160}
                    className="ic-thumb-image"
                    onError={() => {}}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

ImageCarousel.propTypes = {
  images: PropTypes.array.isRequired,
  initialIndex: PropTypes.number,
  title: PropTypes.string,
  thumbSize: PropTypes.number,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  transitionMs: PropTypes.number,
  onIndexChange: PropTypes.func,
};