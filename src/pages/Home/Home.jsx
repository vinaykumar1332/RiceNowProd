import React from "react";
import "./Home.css";
import HeroBanner from "./HeroBanner/HeroBanner";
import BrandCategoryGrid from "./BrandCategoryGrid/BrandCategoryGrid";
import PopularCategoryGrid from "./PopularCategoryGrid/PopularCategoryGrid"

export default function Home() {
  return (
    <>
      <section className="hero-section">
        <HeroBanner />
      </section>
        <BrandCategoryGrid columns={4} maxBrands={12} />
        <PopularCategoryGrid columns={4} maxBrands={12} />
    </>
  );
}
