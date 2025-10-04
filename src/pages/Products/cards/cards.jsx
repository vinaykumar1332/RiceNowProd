// src/components/Products/cards/cards.jsx
import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import "./cards.css";
import { cleanTags } from "../../../utils/helpers"; // Adjust path if needed
import Image from "../Images/Image"; // Ensure this path matches your project
import { TbListDetails } from "react-icons/tb";

const MemoizedCards = React.memo(function Cards({
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
  } = product;

  const rawCandidate = useMemo(() => {
    return (
      (Array.isArray(images) && images.length && images[0]) ||
      image ||
      product.image_id ||
      product.drive_image_id ||
      product.driveId ||
      null
    );
  }, [images, image, product]);

  const isFullUrl = useMemo(() => {
    if (!rawCandidate || typeof rawCandidate !== "string") return false;
    return /^(https?:\/\/|data:|blob:)/i.test(rawCandidate.trim());
  }, [rawCandidate]);

  const imageList = useMemo(
    () =>
      Array.isArray(images) && images.length
        ? images
        : image
        ? [image]
        : rawCandidate
        ? [rawCandidate]
        : [],
    [images, image, rawCandidate]
  );

  const tagList = useMemo(() => cleanTags(tags, tags_array), [tags, tags_array]);
  const isActive = String(active ?? stock ?? "").toLowerCase() === "active";
  const displayWeight = weight || (Array.isArray(weights) ? weights.join(", ") : "—");

  const percentOff = useMemo(() => {
    const p = Number(price);
    const o = Number(offer_price ?? price);
    if (!p || !o || p <= 0 || o >= p) return null;
    return Math.round(((p - o) / p) * 100);
  }, [price, offer_price]);

  const handleOpenOverlay = (evt) => {
    evt?.stopPropagation();
    setExpanded(true);
  };

  const handleCloseOverlay = (evt) => {
    evt?.stopPropagation();
    setExpanded(false);
  };

  return (
    <article className={`card ${isActive ? "card-active" : "card-inactive"}`} aria-hidden={!isActive}>
      <div className="card-media">
        <div className="media-figure" role="img" aria-label={title} onClick={() => onOpenDetails(product)} style={{ cursor: "pointer" }}>
          {imageList.length ? (
            <Image
              imageUrl={isFullUrl ? rawCandidate : null}
              imageId={isFullUrl ? null : rawCandidate}
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
          <h3 className="card-title" onClick={() => onOpenDetails(product)} style={{ cursor: "pointer" }}>
            {title}
          </h3>
          <div className="brand-stock">
            <span className="category">{category}</span>
          </div>
        </div>

        <p className="desc">{description}</p>

        <div className="price-row">
          {offer_price ? <span className="offer">₹{Number(offer_price || price || 0).toFixed(2)}</span> : null}
          {price && String(price) !== String(offer_price) ? <span className="orig">₹{Number(price).toFixed(2)}</span> : null}
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
                <button className="qty-btn" onClick={() => onRemove(product)} aria-label={`Decrease ${title}`}>
                  −
                </button>
                <span className="qty">{qty}</span>
                <button className="qty-btn" onClick={() => onAdd(product)} aria-label={`Increase ${title}`}>
                  +
                </button>
              </>
            ) : (
              <button className="add-btn" onClick={() => onAdd(product)} disabled={!isActive} aria-label={`Add ${title} to cart`}>
                ＋ Add
              </button>
            )}
          </div>

          <button
           title="View details"
            className="details-btn"
            onClick={(e) => {
              onOpenDetails(product);
              handleOpenOverlay(e);
            }}
            aria-expanded={expanded}
            aria-controls="details-panel"
          >
           <TbListDetails />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="details-overlay" role="dialog" aria-modal="true" id="details-panel" onClick={handleCloseOverlay}>
          <div className="details-panel" onClick={(e) => e.stopPropagation()}>
            <button className="details-close" onClick={handleCloseOverlay} aria-label="Close details">
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
                      imageUrl={isFullUrl ? rawCandidate : null}
                      imageId={isFullUrl ? null : rawCandidate}
                      alt={title}
                      size={800}
                      className="details-img"
                      style={{ width: "100%", height: "auto" }}
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
                      <strong>Weight:</strong> {displayWeight}
                    </div>
                    <div className="price-block">
                      {offer_price ? <div className="offer-large">₹{Number(offer_price).toFixed(2)}</div> : null}
                      {price && String(price) !== String(offer_price) ? <div className="orig-large">₹{Number(price).toFixed(2)}</div> : null}
                    </div>
                    <div className="tag-list">{tagList.map((t, idx) => <span key={idx} className="tag">{t}</span>)}</div>
                  </div>
                </div>
              </div>

              <div className="details-footer">
                <div className="qty-controls">
                  {qty > 0 ? (
                    <>
                      <button className="qty-btn" onClick={() => onRemove(product)} aria-label={`Decrease ${title}`}>
                        −
                      </button>
                      <span className="qty">{qty}</span>
                      <button className="qty-btn" onClick={() => onAdd(product)} aria-label={`Increase ${title}`}>
                        +
                      </button>
                    </>
                  ) : (
                    <button className="add-btn" onClick={() => onAdd(product)} aria-label={`Add ${title} to cart`}>
                      ＋ Add
                    </button>
                  )}
                </div>

                <button className="close-secondary" onClick={handleCloseOverlay} aria-label="Close details">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
});

MemoizedCards.propTypes = {
  product: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    offer_price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    images: PropTypes.arrayOf(PropTypes.string),
    image: PropTypes.string,
    tags: PropTypes.string,
    tags_array: PropTypes.arrayOf(PropTypes.string),
    weight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    weights: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
    stock: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    active: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    category: PropTypes.string,
    image_id: PropTypes.string,
    drive_image_id: PropTypes.string,
    driveId: PropTypes.string,
  }),
  onAdd: PropTypes.func,
  onRemove: PropTypes.func,
  qty: PropTypes.number,
  onOpenDetails: PropTypes.func,
};

export default MemoizedCards;
