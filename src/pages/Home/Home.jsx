import React from "react";
import "./Home.css";
import HeroBanner from "./HeroBanner/HeroBanner";
import BrandCategoryGrid from "./BrandCategoryGrid/BrandCategoryGrid";

export default function Home() {
  return (
    <>
      <section className="hero-section">
        <HeroBanner />
      </section>
        <BrandCategoryGrid columns={4} maxBrands={12} />
    </>
  );
}
