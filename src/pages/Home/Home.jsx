import React from "react";
import "./Home.css";
import Hero from "./HeroBanner/hero"

export default function Home() {
  return (
    <>
  <Hero />
    <div className="home-page-container">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
        <h1>Welcome to Ricenow</h1>
        <p>This is the homepage. Explore our products to find the best deals!</p>
      </div>
    </div>
    </>
  );
}
