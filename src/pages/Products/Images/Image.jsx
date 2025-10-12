import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import "./Image.css";


export default function Image({
  imageUrl,
  cloudName = "dbgyofocp",
  publicId, // optional: Cloudinary public id (if imageUrl not supplied)
  alt = "",
  className = "",
  containerClassName = "",
  widthHint = 200,
  heightHint = 200,
  loadingAttr = "lazy", // forwarded to <img>
}) {
  const wrapperRef = useRef(null);
  const imgRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // build cloudinary URL if publicId provided and no imageUrl
  const buildCloudinary = (cn, pid) => {
    if (!cn || !pid) return null;
    // Use auto-format & auto-quality as a good default
    return `https://res.cloudinary.com/${cn}/image/upload/f_auto,q_auto/${encodeURIComponent(
      pid
    )}`;
  };

  // choose source candidate (prefer imageUrl)
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setLoading(false);
    if (imageUrl && String(imageUrl).trim()) {
      setSrc(null); // will be assigned when inView
      return;
    }
    if (!imageUrl && publicId) {
      setSrc(null);
      return;
    }
    // neither provided -> show placeholder only
    setSrc(null);
  }, [imageUrl, publicId]);

  // IntersectionObserver: set inView
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) {
      setInView(true);
      return;
    }
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            try {
              obs.disconnect();
            } catch (e) {}
          }
        });
      },
      { rootMargin: "250px" }
    );

    obs.observe(el);
    return () => {
      try {
        obs.disconnect();
      } catch (e) {}
    };
  }, []);

  // when inView, assign final src (imageUrl or cloudinary)
  useEffect(() => {
    if (!inView) return;

    if (imageUrl && String(imageUrl).trim()) {
      setSrc(String(imageUrl).trim());
      return;
    }

    if (!imageUrl && publicId) {
      const cdn = buildCloudinary(cloudName, publicId);
      if (cdn) setSrc(cdn);
      return;
    }

    // nothing to load
    setSrc(null);
  }, [inView, imageUrl, publicId, cloudName]);

  // when src changes, start loading state
  useEffect(() => {
    if (src) {
      setLoading(true);
      setLoaded(false);
      setFailed(false);
    } else {
      setLoading(false);
    }
  }, [src]);

  const handleLoad = () => {
    setLoaded(true);
    setLoading(false);
    setFailed(false);
  };

  const handleError = () => {
    setFailed(true);
    setLoading(false);
  };

  // compute aspect-ratio padding for skeleton if hints provided
  const aspectPadding =
    widthHint && heightHint ? `${(heightHint / widthHint) * 100}%` : null;

  return (
    <div
      ref={wrapperRef}
      className={`lazy-image-wrapper ${containerClassName} ${
        loaded ? "img-loaded" : ""
      } ${failed ? "img-failed" : ""}`}
      data-loaded={loaded ? "true" : "false"}
    >
      {/* ratio box to reserve space and avoid layout shift */}
      <div
        className="img-ratio"
        style={aspectPadding ? { paddingBottom: aspectPadding } : undefined}
        aria-hidden="true"
      />

      {/* Skeleton / shimmer */}
      {(!loaded && !failed) && (
        <div className={`img-skeleton ${loading ? "loading" : ""}`} />
      )}

      {/* Actual image */}
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

      {/* Fallback placeholder when failed or when no src available */}
      {(!src || failed) && (
        <div className="img-placeholder" role="img" aria-label={alt || "image"}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect width="24" height="24" rx="3" fill="#f3f4f6" />
            <path d="M6 15l3-4 2 3 3-4 4 6" stroke="#cbd5e1" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  );
}

Image.propTypes = {
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
