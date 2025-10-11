import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

export default function Image({
  imageId,
  imageUrl,
  alt,
  size = 200,
  className = "",
  style = {},
  placeholder = null,
}) {
  const rootRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [failed, setFailed] = useState(false);
  const [srcCandidate, setSrcCandidate] = useState(null);
  const [triedFallback, setTriedFallback] = useState(false);

  // loading / loaded state for shimmer & fade
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const normalizeId = (id) => {
    if (!id) return null;
    return String(id).replace(/[{}]/g, "").trim();
  };

  const buildThumbnail = (id, sz) => {
    const clean = normalizeId(id);
    if (!clean) return null;
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(clean)}&sz=${encodeURIComponent(sz)}`;
  };

  const buildUcFallback = (id) => {
    const clean = normalizeId(id);
    if (!clean) return null;
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(clean)}`;
  };

  // Choose candidate src when props change
  useEffect(() => {
    setLoaded(false);
    setFailed(false);

    if (imageUrl && String(imageUrl).trim()) {
      setSrcCandidate(String(imageUrl).trim());
      setTriedFallback(true);
      return;
    }

    if (imageId && String(imageId).trim()) {
      const thumb = buildThumbnail(imageId, size);
      setSrcCandidate(thumb);
      setTriedFallback(false);
      return;
    }

    setSrcCandidate(null);
    setTriedFallback(true);
  }, [imageId, imageUrl, size]);

  // IntersectionObserver to delay loading until near viewport
  useEffect(() => {
    if (!rootRef.current) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            try { obs.disconnect(); } catch (e) { /* ignore */ }
          }
        });
      },
      { rootMargin: "250px" }
    );

    obs.observe(rootRef.current);

    return () => {
      try { obs.disconnect(); } catch (e) { /* ignore */ }
    };
  }, [rootRef]);

  const defaultPlaceholder =
    placeholder ||
    "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'><rect fill='#eee' width='100%' height='100%'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#aaa' font-family='sans-serif' font-size='14'>No image</text></svg>`
      );

  // handle image error → try uc fallback for Drive IDs, or mark failed
  const onImgError = (e) => {
    if (triedFallback) {
      setFailed(true);
      setLoading(false);
      // console.debug('[Image] final failure for src:', e?.target?.src);
      return;
    }
    if (imageId) {
      const uc = buildUcFallback(imageId);
      if (uc && uc !== srcCandidate) {
        // console.debug('[Image] thumbnail failed, trying uc fallback:', uc);
        setSrcCandidate(uc);
        setTriedFallback(true);
        setLoading(true);
        return;
      }
    }
    setFailed(true);
    setTriedFallback(true);
    setLoading(false);
    // console.debug('[Image] error and no fallback available for src:', e?.target?.src);
  };

  const onImgLoad = () => {
    setLoaded(true);
    setLoading(false);
  };

  // derive final src to actually assign to <img> (only when inView and not failed)
  const shouldLoad = inView && srcCandidate && !failed;
  const imgSrc = shouldLoad ? srcCandidate : null;

  // start loading state when imgSrc becomes available
  useEffect(() => {
    if (imgSrc) {
      setLoading(true);
      setLoaded(false);
    } else {
      setLoading(false);
      // keep loaded state if previously loaded a different src (avoid flash)
      // setLoaded(false);
    }
  }, [imgSrc]);

  return (
    <div
      ref={rootRef}
      className={`lazy-image-wrapper ${className}`}
      style={{
        position: "relative",
        display: "block",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Skeleton shimmer while the image is loading (or when no src) */}
      {(loading || (!imgSrc && !failed)) && (
        <div
          className="img-skeleton"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        />
      )}

      {/* If failed or no candidate, show placeholder SVG (not lazy) */}
      {!imgSrc && failed && (
        <img
          src={defaultPlaceholder}
          alt={alt ?? ""}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "contain",
            objectPosition: "center",
            opacity: 1,
          }}
          aria-hidden={false}
        />
      )}

      {/* Real image (renders only when we should load) */}
      {imgSrc && !failed && (
        <img
          src={imgSrc}
          alt={alt ?? ""}
          loading="lazy"
          decoding="async"
          onError={onImgError}
          onLoad={onImgLoad}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "contain",
            objectPosition: "center",
            transition: "opacity 420ms cubic-bezier(.2,.9,.2,1), transform 420ms cubic-bezier(.2,.9,.2,1)",
            opacity: loaded ? 1 : 0,
            transform: loaded ? "translateY(0) scale(1)" : "translateY(6px) scale(0.998)",
          }}
        />
      )}

      {/* If we haven't started loading yet and no srcCandidate, show placeholder */}
      {!imgSrc && !failed && !loading && (
        <img
          src={defaultPlaceholder}
          alt={alt ?? ""}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "cover",
            objectPosition: "center",
            opacity: 1,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

Image.propTypes = {
  imageId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  imageUrl: PropTypes.string,
  alt: PropTypes.string,
  size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  className: PropTypes.string,
  style: PropTypes.object,
  placeholder: PropTypes.string,
};
