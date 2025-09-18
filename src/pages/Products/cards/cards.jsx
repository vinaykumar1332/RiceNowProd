import React, { useMemo } from "react";
import PropTypes from 'prop-types';
import "./cards.css";
import { cleanTags } from "../../../utils/helpers"; // Adjust path if needed

const MemoizedCards = React.memo(function Cards({
  product = {},
  onAdd = () => {},
  onRemove = () => {},
  qty = 0,
  onOpenDetails = () => {}
}) {
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
  const imageList = useMemo(() => Array.isArray(images) && images.length ? images : image ? [image] : [], [images, image]);
  const tagList = useMemo(() => cleanTags(tags, tags_array), [tags, tags_array]);
  const isActive = String(active ?? stock ?? "").toLowerCase() === "active";
  const displayWeight = weight || (Array.isArray(weights) ? weights.join(", ") : "—");

  return (
    <article className={`card ${isActive ? "card-active" : "card-inactive"}`} aria-hidden={!isActive}>
      <div className="card-media">
        <div className="media-figure" role="img" aria-label={title}>
          {imageList.length ? (
            <img
              src={imageList[0]}
              alt={title}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='100%' height='100%' fill='%23f0f0f0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='18'>Image not available</text></svg>";
              }}
            />
          ) : (
            <div className="image-placeholder">No image</div>
          )}
        </div>
      </div>
      <div className="card-body">
        <div className="card-head">
          <h3 className="card-title">{title}</h3>
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
          <div><strong>Weight:</strong> {displayWeight}</div>
        </div>
        <div className="tags-row">
          {tagList.length ? (
            <div className="tags">
              {tagList.slice(0,2).map((t,i) => (
                <span className="tag" key={i} title={t}>{t}</span>
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
                <button className="qty-btn" onClick={() => onRemove(product)} aria-label={`Decrease ${title}`}>−</button>
                <span className="qty">{qty}</span>
                <button className="qty-btn" onClick={() => onAdd(product)} aria-label={`Increase ${title}`}>+</button>
              </>
            ) : (
              <button className="add-btn" onClick={() => onAdd(product)} disabled={!isActive} aria-label={`Add ${title} to cart`}>＋ Add</button>
            )}
          </div>
          <button className="details-btn" onClick={() => onOpenDetails(product)} aria-label={`Open ${title} details`}>
            Details
          </button>
        </div>
      </div>
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
  }),
  onAdd: PropTypes.func,
  onRemove: PropTypes.func,
  qty: PropTypes.number,
  onOpenDetails: PropTypes.func,
};

export default MemoizedCards;