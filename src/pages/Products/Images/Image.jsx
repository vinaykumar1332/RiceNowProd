import React, { useEffect, useRef, useState, useCallback } from "react";
import PropTypes from "prop-types";
import "./Image.css";

function buildCloudinaryUrl(cloudName, publicId) {
  if (!cloudName || !publicId) return null;
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${encodeURIComponent(publicId)}`;
}

function isFullUrl(str) {
  return typeof str === "string" && /^(https?:\/\/|data:|blob:)/i.test(String(str).trim());
}

function resolveSrcCandidate(imageUrl, cloudName, publicId) {
  if (imageUrl && String(imageUrl).trim()) return String(imageUrl).trim();
  if (!imageUrl && publicId) return buildCloudinaryUrl(cloudName, publicId);
  return null;
}

function safeHasIntersectionObserver() {
  return typeof window !== "undefined" && "IntersectionObserver" in window;
}

function ImageComponent({
  imageUrl,
  cloudName = "dbgyofocp",
  publicId,
  alt = "",
  className = "",
  containerClassName = "",
  widthHint = 200,
  heightHint = 200,
  loadingAttr = "lazy",
}) {
  const wrapperRef = useRef(null);
  const imgRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setLoading(false);
    setSrc(null);
  }, [imageUrl, publicId]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || !safeHasIntersectionObserver()) {
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
    obs.observe(el);
    return () => {
      try { obs.disconnect(); } catch (e) {}
    };
  }, []);

  useEffect(() => {
    if (!inView) return;
    const candidate = resolveSrcCandidate(imageUrl, cloudName, publicId);
    setSrc(candidate);
  }, [inView, imageUrl, publicId, cloudName]);

  useEffect(() => {
    if (src) {
      setLoading(true);
      setLoaded(false);
      setFailed(false);
    } else {
      setLoading(false);
    }
  }, [src]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    setLoading(false);
    setFailed(false);
  }, []);

  const handleError = useCallback(() => {
    setFailed(true);
    setLoading(false);
  }, []);

  const aspectPadding = widthHint && heightHint ? `${(heightHint / widthHint) * 100}%` : null;

  return (
    <div
      ref={wrapperRef}
      className={`lazy-image-wrapper ${containerClassName} ${loaded ? "img-loaded" : ""} ${failed ? "img-failed" : ""}`}
      data-loaded={loaded ? "true" : "false"}
    >
      <div className="img-ratio" style={aspectPadding ? { paddingTop: aspectPadding } : {}} aria-hidden="true" />

      {(!loaded && !failed) && <div className={`img-skeleton ${loading ? "loading" : ""}`} />}

      {src && !failed && (
        <img
          ref={imgRef}
          className={`lazy-image ${className} ${loaded ? "loaded" : ""}`}
          src={src}
          alt={alt}
          loading={loadingAttr}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {(!src || failed) && (
        <div className="img-placeholder" role="img" aria-label={alt || "image"}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect width="24" height="24" rx="3" fill="#f3f4f6" />
            <path d="M6 15l3-4 2 3 3-4 4 6" stroke="#cbd5e1" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  );
}

ImageComponent.propTypes = {
  imageUrl: PropTypes.string,
  cloudName: PropTypes.string,
  publicId: PropTypes.string,
  alt: PropTypes.string,
  className: PropTypes.string,
  containerClassName: PropTypes.string,
  widthHint: PropTypes.number,
  heightHint: PropTypes.number,
  loadingAttr: PropTypes.oneOf(["lazy", "eager", "auto"]),
};

export default React.memo(ImageComponent);
