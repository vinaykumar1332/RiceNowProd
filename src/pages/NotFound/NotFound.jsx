import React from "react";
import { Link } from "react-router-dom";
import "./NotFound.css";

export default function NotFound() {
  return (
    <div className="notfound-container">
      <h1 className="notfound-title">404</h1>
      <p className="notfound-message">
        Oops! The page you are looking for does not exist.
      </p>
      <Link to="/" className="notfound-button">
        ⬅ Back to Home
      </Link>
    </div>
  );
}
