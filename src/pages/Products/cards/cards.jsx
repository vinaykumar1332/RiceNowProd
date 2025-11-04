import React, { useMemo, useState, useCallback } from "react";
import PropTypes from "prop-types";
import "./cards.css";
import { cleanTags } from "../../../utils/helpers";
import Image from "../Images/Image";
import { TbListDetails } from "react-icons/tb";

const URL_REGEX = /^(https?:\/\/|data:|blob:)/i;

function isFullUrl(candidate) {
  return typeof candidate === "string" && URL_REGEX.test(candidate.trim());
}

function computeRawCandidate(product, images, image) {
  if (Array.isArray(images) && images.length) return images[0];
  if (image) return image;
  if (product.image_id) return product.image_id;
  if (product.drive_image_id) return product.drive_image_id;
  if (product.driveId) return product.driveId;
  return null;
}

function formatNumber(n) {
  const num = Number(n ?? 0);
  if (Number.isNaN(num)) return "0.00";
  return num.toFixed(2);
}

function Cards({
  product = {},
  onAdd = () => {},
  onRemove = () => {},
  qty = 0,
  onOpenDetails = () => {},
}) {
  const [expanded, setExpanded] = useState(false);

  const {
    title = "Untitled product",
    description = "No description.",
    price,
    offer_price,
    images,
    image,
    tags,
    tags_array,
    weight,
    weights,
    stock,
    active,
    category = "Unknown",
    brand: productBrand,
    brand_name,
    mfg,
  } = product;

  const brand = useMemo(() => {
    const b = productBrand ?? brand_name ?? mfg ?? "";
    return String(b).trim() || "—";
  }, [productBrand, brand_name, mfg]);

  const rawCandidate = useMemo(() => computeRawCandidate(product, images, image), [product, images, image]);

  const candidateIsUrl = useMemo(() => isFullUrl(rawCandidate), [rawCandidate]);

  const imageList = useMemo(() => {
    if (Array.isArray(images) && images.length) return images;
    if (image) return [image];
    if (rawCandidate) return [rawCandidate];
    return [];
  }, [images, image, rawCandidate]);

  const tagList = useMemo(() => cleanTags(tags, tags_array) || [], [tags, tags_array]);

  const isActive = useMemo(() => {
    const v = active ?? stock ?? "";
    return String(v).toLowerCase() === "active" || v === true || (typeof v === "number" && v > 0);
  }, [active, stock]);

  const displayWeight = useMemo(() => {
    if (weight) return weight;
    if (Array.isArray(weights) && weights.length) return weights.join(", ");
    return "—";
  }, [weight, weights]);

  const percentOff = useMemo(() => {
    const p = Number(price);
    const o = Number(offer_price ?? price);
    if (!p || !o || p <= 0 || o >= p) return null;
    return Math.round(((p - o) / p) * 100);
  }, [price, offer_price]);

  const handleAdd = useCallback(
    (e) => {
      e?.stopPropagation();
      onAdd(product);
    },
    [onAdd, product]
  );

  const handleRemove = useCallback(
    (e) => {
      e?.stopPropagation();
      onRemove(product);
    },
    [onRemove, product]
  );

  const handleOpenDetails = useCallback(
    (e) => {
      e?.stopPropagation();
      onOpenDetails(product);
    },
    [onOpenDetails, product]
  );

  const openOverlay = useCallback(
    (e) => {
      e?.stopPropagation();
      setExpanded(true);
    },
    []
  );

  const closeOverlay = useCallback(
    (e) => {
      e?.stopPropagation();
      setExpanded(false);
    },
    []
  );

  return (
    <article className={`card ${isActive ? "card-active" : "card-inactive"}`} aria-hidden={!isActive}>
      <div className="card-media">
        <div
          className="media-figure"
          role="img"
          aria-label={title}
          onClick={handleOpenDetails}
          style={{ cursor: "pointer" }}
        >
          {imageList.length ? (
            <Image
              imageUrl={candidateIsUrl ? rawCandidate : null}
              publicId={candidateIsUrl ? null : rawCandidate}
              alt={title}
              className="card-img"
            />
          ) : (
            <div className="image-placeholder">No image</div>
          )}

          {percentOff ? (
            <div className="offer-badge offer-badge-right" aria-hidden={false}>
              <div className="offer-percentage">{percentOff}%</div>
              <div className="offer-text">OFF</div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="card-body">
        <div className="card-head">
          <h3 className="card-title" onClick={handleOpenDetails} style={{ cursor: "pointer" }}>
            {title}
          </h3>
          <div className="brand-stock">
            <span className="category">{category}</span>
          </div>
        </div>

        <div className="brand-row" aria-hidden={false}>
          <strong className="brand-label">Brand:</strong>
          <span className="brand-value" title={brand}>
            {brand}
          </span>
        </div>

        <p className="desc">{description}</p>

        <div className="price-row">
          {offer_price ? <span className="offer">₹{formatNumber(offer_price ?? price)}</span> : null}
          {price && String(price) !== String(offer_price) ? <span className="orig">₹{formatNumber(price)}</span> : null}
        </div>

        <div className="info-row">
          <div>
            <strong>Weight:</strong> {displayWeight}
          </div>
        </div>

        <div className="tags-row">
          {tagList.length ? (
            <div className="tags">
              {tagList.slice(0, 2).map((t, i) => (
                <span className="tag" key={i} title={t}>
                  {t}
                </span>
              ))}
              {tagList.length > 2 && <span className="tag tag-more">+{tagList.length - 2}</span>}
            </div>
          ) : (
            <div className="tags tags-empty">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          )}
        </div>

        <div className="card-actions">
          <div className="qty-controls" aria-hidden={!isActive}>
            {qty > 0 ? (
              <>
                <button className="qty-btn" onClick={handleRemove} aria-label={`Decrease ${title}`}>
                  −
                </button>
                <span className="qty">{qty}</span>
                <button className="qty-btn" onClick={handleAdd} aria-label={`Increase ${title}`}>
                  +
                </button>
              </>
            ) : (
              <button className="add-btn" onClick={handleAdd} disabled={!isActive} aria-label={`Add ${title} to cart`}>
                ＋ Add
              </button>
            )}
          </div>

          <button
            title="View details"
            className="details-btn"
            onClick={(e) => {
              handleOpenDetails(e);
              openOverlay(e);
            }}
            aria-expanded={expanded}
            aria-controls="details-panel"
          >
            <TbListDetails />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="details-overlay" role="dialog" aria-modal="true" id="details-panel" onClick={closeOverlay}>
          <div className="details-panel" onClick={(e) => e.stopPropagation()}>
            <button className="details-close" onClick={closeOverlay} aria-label="Close details">
              ✕
            </button>
            <div className="details-inner">
              <div className="details-header">
                <h4>{title}</h4>
                {percentOff && <div className="overlay-badge">{percentOff}% OFF</div>}
              </div>

              <div className="details-body">
                <div className="details-image-wrap">
                  {imageList.length ? (
                    <Image
                      imageUrl={candidateIsUrl ? rawCandidate : null}
                      publicId={candidateIsUrl ? null : rawCandidate}
                      alt={title}
                      className="details-img"
                      widthHint={800}
                      heightHint={600}
                    />
                  ) : (
                    <div className="image-placeholder">No image</div>
                  )}
                </div>

                <div className="details-text">
                  <p className="full-desc">{description}</p>

                  <div className="details-meta">
                    <div>
                      <strong>Category:</strong> {category}
                    </div>
                    <div>
                      <strong>Brand:</strong> {brand}
                    </div>
                    <div>
                      <strong>Weight:</strong> {displayWeight}
                    </div>

                    <div className="price-block">
                      {offer_price ? <div className="offer-large">₹{formatNumber(offer_price)}</div> : null}
                      {price && String(price) !== String(offer_price) ? <div className="orig-large">₹{formatNumber(price)}</div> : null}
                    </div>

                    <div className="tag-list">{tagList.map((t, idx) => <span key={idx} className="tag">{t}</span>)}</div>
                  </div>
                </div>
              </div>

              <div className="details-footer">
                <div className="qty-controls">
                  {qty > 0 ? (
                    <>
                      <button className="qty-btn" onClick={handleRemove} aria-label={`Decrease ${title}`}>
                        −
                      </button>
                      <span className="qty">{qty}</span>
                      <button className="qty-btn" onClick={handleAdd} aria-label={`Increase ${title}`}>
                        +
                      </button>
                    </>
                  ) : (
                    <button className="add-btn" onClick={handleAdd} aria-label={`Add ${title} to cart`}>
                      ＋ Add
                    </button>
                  )}
                </div>

                <button className="close-secondary" onClick={closeOverlay} aria-label="Close details">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

Cards.propTypes = {
  product: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    offer_price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    images: PropTypes.arrayOf(PropTypes.string),
    image: PropTypes.string,
    tags: PropTypes.any,
    tags_array: PropTypes.arrayOf(PropTypes.string),
    weight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    weights: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
    stock: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    active: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    category: PropTypes.string,
    brand: PropTypes.string,
    brand_name: PropTypes.string,
    mfg: PropTypes.string,
    image_id: PropTypes.string,
    drive_image_id: PropTypes.string,
    driveId: PropTypes.string,
  }),
  onAdd: PropTypes.func,
  onRemove: PropTypes.func,
  qty: PropTypes.number,
  onOpenDetails: PropTypes.func,
};

export default React.memo(Cards);
