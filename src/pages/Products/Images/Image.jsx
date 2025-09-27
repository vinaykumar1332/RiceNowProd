import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

/**
 * Robust Image component for Drive file ids or direct URLs.
 * - imageId: google drive id string (e.g. "1gPU..."), will try thumbnail then uc fallback
 * - imageUrl: full image URL or data: URL
 * - size: numeric for Drive thumbnail sz param
 *
 * Behavior:
 * - builds candidate src on mount/update
 * - uses IntersectionObserver to lazy-load
 * - if the constructed src fails (onError), tries a fallback Drive url
 * - logs minimal debug messages to console (remove in prod)
 */
export default function Image({ imageId, imageUrl, alt, size = 200, className = "", style = {}, placeholder }) {
  const rootRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [failed, setFailed] = useState(false);
  const [srcCandidate, setSrcCandidate] = useState(null);
  const [triedFallback, setTriedFallback] = useState(false);

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
    // This URL often works when thumbnail fails
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(clean)}`;
  };

  useEffect(() => {
    // Choose initial candidate:
    if (imageUrl && String(imageUrl).trim()) {
      setSrcCandidate(String(imageUrl).trim());
      setTriedFallback(true); // nothing to fallback to
      setFailed(false);
      return;
    }

    if (imageId && String(imageId).trim()) {
      const thumb = buildThumbnail(imageId, size);
      setSrcCandidate(thumb);
      setFailed(false);
      setTriedFallback(false);
      return;
    }

    setSrcCandidate(null);
    setFailed(false);
    setTriedFallback(true);
  }, [imageId, imageUrl, size]);

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
            try { obs.disconnect(); } catch (e) {}
          }
        });
      },
      { rootMargin: "250px" }
    );

    obs.observe(rootRef.current);

    return () => {
      try { obs.disconnect(); } catch (e) {}
    };
  }, [rootRef]);

  const defaultPlaceholder =
    placeholder ||
    "data:image/svg+xml;charset=utf-8," +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'><rect fill='#eee' width='100%' height='100%'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#aaa' font-family='sans-serif' font-size='14'>No image</text></svg>`
      );

  const onImgError = (e) => {
    // If we already tried fallback or there is no imageId, mark failed
    if (triedFallback) {
      setFailed(true);
      console.debug("[Image] final failure for src:", e?.target?.src);
      return;
    }

    // if we haven't tried fallback and we have an imageId, try uc fallback
    if (imageId) {
      const uc = buildUcFallback(imageId);
      if (uc && uc !== srcCandidate) {
        console.debug("[Image] thumbnail failed, trying uc fallback:", uc);
        setSrcCandidate(uc);
        setTriedFallback(true);
        // keep failed false — we'll retry with new src
        return;
      }
    }

    setFailed(true);
    setTriedFallback(true);
    console.debug("[Image] error and no fallback available for src:", e?.target?.src);
  };

  const imgSrc = inView && !failed ? srcCandidate : null;

  return (
    <div
      ref={rootRef}
      className={`lazy-image-wrapper ${className}`}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={alt ?? ""}
          loading="lazy"
          onError={onImgError}
          
        />
      ) : (
        <img
          src={defaultPlaceholder}
          alt={alt ?? ""}
          aria-hidden="true"
          style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
    </div>
  );
}

Image.propTypes = {
  imageId: PropTypes.string,
  imageUrl: PropTypes.string,
  alt: PropTypes.string,
  size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  className: PropTypes.string,
  style: PropTypes.object,
  placeholder: PropTypes.string,
};
