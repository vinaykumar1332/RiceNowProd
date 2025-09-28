import React from "react";
import "./Home.css";
import Hero from "./HeroBanner/Hero";

export default function Home() {
  return (
    <div className="home-page-container">
      <Hero />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
        <h1>Welcome to Ricenow</h1>
        <p>This is the homepage. Explore our products to find the best deals!</p>
      </div>
    </div>
  );
}
