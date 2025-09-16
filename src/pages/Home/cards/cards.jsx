import React from "react";
import "./cards.css";

function cleanTags(tags, tags_array) {
  if (Array.isArray(tags_array)) return tags_array.map(t => String(t).replace(/(^"|"$)/g, "").trim()).filter(Boolean);
  if (typeof tags === "string") return tags.split("|").map(t => t.replace(/(^"|"$)/g,"").trim()).filter(Boolean);
  return [];
}

export default function Cards({ product = {} }) {
  const {
    title,
    description,
    price,
    offer_price,
    images,
    image,
    tags,
    tags_array,
    brand,
    weight,
    weights,
    stock,
  } = product;

  const imageList = Array.isArray(images) && images.length ? images :
                    image ? [image] : [];

  const tagList = cleanTags(tags, tags_array);

  return (
    <article className="card">
      <div className="card-media">
        {imageList.length ? (
          <img
            src={imageList[0]}
            alt={title || "product image"}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='%23f0f0f0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='18'>Image not available</text></svg>";
            }}
          />
        ) : (
          <div className="image-placeholder">No image</div>
        )}
      </div>

      <div className="card-body">
        <h2 className="card-title">{title || "Untitled product"}</h2>
        <div className="meta-row">
          <span className="brand">{brand || "Unknown"}</span>
          <span className={`stock ${String(stock || "").toLowerCase() === "active" ? "in" : "out"}`}>
            {stock ? String(stock) : "N/A"}
          </span>
        </div>

        <p className="desc">{description || "No description."}</p>

        <div className="price-row">
          {offer_price ? <span className="offer">₹{Number(offer_price).toFixed(2)}</span> : null}
          {price && price !== offer_price ? <span className="orig">₹{Number(price).toFixed(2)}</span> : null}
        </div>

        <div className="info-row">
          <div><strong>Weight:</strong> {weight || (Array.isArray(weights) ? weights.join(", ") : "—")}</div>
        </div>

        {tagList.length > 0 && <div className="tags">{tagList.map((t,i)=>(<span className="tag" key={i}>{t}</span>))}</div>}
      </div>
    </article>
  );
}
