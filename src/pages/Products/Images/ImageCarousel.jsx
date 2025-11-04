import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import Image from "./Image";
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
  width = 680,
  height = 420,
  transitionMs = 420,
  onIndexChange = () => {},
}) {
  const sanitizedImages = useMemo(() => Array.isArray(images) ? images : [], [images]);
  const maxIndex = Math.max(0, sanitizedImages.length - 1);

  const [index, setIndex] = useState(() => {
    const i = Number.isFinite(initialIndex) ? Math.max(0, Math.min(initialIndex, maxIndex)) : 0;
    return i;
  });

  const [loaded, setLoaded] = useState(() => sanitizedImages.map(() => false));
  const [errored, setErrored] = useState(() => sanitizedImages.map(() => false));

  useEffect(() => {
    setLoaded(sanitizedImages.map(() => false));
    setErrored(sanitizedImages.map(() => false));
    setIndex((i) => Math.min(i, Math.max(0, sanitizedImages.length - 1)));
  }, [sanitizedImages]);

  useEffect(() => {
    onIndexChange(index);
    const activeThumb = thumbsRef.current?.querySelector(".ic-thumb-btn.active");
    if (activeThumb && typeof activeThumb.scrollIntoView === "function") {
      activeThumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [index, onIndexChange]);

  const mainRef = useRef(null);
  const thumbsRef = useRef(null);
  const touchStartX = useRef(0);
  const deltaX = useRef(0);
  const isPointerDown = useRef(false);

  const onPointerDown = useCallback((clientX) => {
    isPointerDown.current = true;
    touchStartX.current = clientX;
    deltaX.current = 0;
  }, []);

  const onPointerMove = useCallback((clientX) => {
    if (!isPointerDown.current) return;
    deltaX.current = clientX - touchStartX.current;
    if (mainRef.current) mainRef.current.style.transform = `translateX(${deltaX.current}px)`;
  }, []);

  const onPointerUp = useCallback(() => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    const threshold = Math.max(48, (typeof width === "number" ? width : 680) * 0.06);
    if (Math.abs(deltaX.current) > threshold) {
      setIndex((prev) => (deltaX.current > 0 ? (prev > 0 ? prev - 1 : maxIndex) : (prev < maxIndex ? prev + 1 : 0)));
    }
    if (mainRef.current) mainRef.current.style.transform = "";
    deltaX.current = 0;
  }, [maxIndex, width]);

  const handleTouchStart = useCallback((e) => {
    const clientX = (e.touches && e.touches[0] && e.touches[0].clientX) || 0;
    onPointerDown(clientX);
  }, [onPointerDown]);

  const handleTouchMove = useCallback((e) => {
    const clientX = (e.touches && e.touches[0] && e.touches[0].clientX) || 0;
    onPointerMove(clientX);
  }, [onPointerMove]);

  const handleTouchEnd = useCallback(() => onPointerUp(), [onPointerUp]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    onPointerDown(e.clientX);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp, { once: true });
  }, [onPointerDown]);

  const handleMouseMove = useCallback((e) => onPointerMove(e.clientX), [onPointerMove]);

  const handleMouseUp = useCallback(() => {
    onPointerUp();
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }, [onPointerUp]);

  useEffect(() => {
    const kb = (ev) => {
      if (ev.key === "ArrowLeft") setIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
      else if (ev.key === "ArrowRight") setIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
    };
    window.addEventListener("keydown", kb);
    return () => window.removeEventListener("keydown", kb);
  }, [maxIndex]);

  const handleImgLoad = useCallback((i) => {
    setLoaded((prev) => {
      const copy = prev.slice();
      copy[i] = true;
      return copy;
    });
    setErrored((prev) => {
      const copy = prev.slice();
      copy[i] = false;
      return copy;
    });
  }, []);

  const handleImgError = useCallback((i) => {
    setErrored((prev) => {
      const copy = prev.slice();
      copy[i] = true;
      return copy;
    });
    setLoaded((prev) => {
      const copy = prev.slice();
      copy[i] = true;
      return copy;
    });
  }, []);

  const gotoIndex = useCallback((i) => {
    if (i === index) return;
    setIndex(i);
  }, [index]);

  const visibleCount = sanitizedImages.length;
  const carouselStyle = useMemo(() => ({
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    "--ic-transition-ms": `${transitionMs}ms`,
  }), [width, height, transitionMs]);

  return (
    <div className="ic-root">
      <div
        className="ic-viewport"
        style={carouselStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        role="presentation"
        aria-label={`${title} product images carousel`}
      >
        <div className="ic-slides" ref={mainRef}>
          {sanitizedImages.map((img, i) => {
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
                  <div className="ic-loader" aria-hidden>
                    <div className="ic-spinner" />
                  </div>
                )}

                {src ? (
                  <img
                    className="ic-image"
                    src={src}
                    alt={`${title} (${i + 1}/${visibleCount})`}
                    onLoad={() => handleImgLoad(i)}
                    onError={() => handleImgError(i)}
                    decoding="async"
                    loading="lazy"
                  />
                ) : (
                  <Image
                    imageUrl={null}
                    publicId={img}
                    alt={`${title} (${i + 1}/${visibleCount})`}
                    className="ic-image"
                    containerClassName="ic-image-wrapper"
                    widthHint={width}
                    heightHint={height}
                  />
                )}

                {errored[i] && (
                  <div className="ic-error" aria-hidden>
                    <img src={PLACEHOLDER} alt="fallback" />
                    <div className="ic-error-text">Image not available</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="ic-bullets" role="tablist" aria-label="Image bullets">
        {sanitizedImages.map((_, i) => (
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

      <div className="ic-thumbs-wrap">
        <div className="ic-thumbs" ref={thumbsRef} role="tablist" aria-label="Thumbnails">
          {sanitizedImages.map((img, i) => {
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
                  {src ? (
                    <img
                      src={src}
                      alt={`${title} thumbnail ${i + 1}`}
                      className="ic-thumb-image"
                      decoding="async"
                      loading="lazy"
                      onLoad={() => handleImgLoad(i)}
                      onError={() => handleImgError(i)}
                    />
                  ) : (
                    <Image
                      imageUrl={null}
                      publicId={img}
                      alt={`${title} thumbnail ${i + 1}`}
                      className="ic-thumb-image"
                      containerClassName="ic-thumb-image-wrap"
                      widthHint={thumbSize}
                      heightHint={thumbSize}
                    />
                  )}
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
  images: PropTypes.array,
  initialIndex: PropTypes.number,
  title: PropTypes.string,
  thumbSize: PropTypes.number,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  transitionMs: PropTypes.number,
  onIndexChange: PropTypes.func,
};
