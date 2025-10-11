import React from "react";
import "./Home.css";
import HeroBanner from "./HeroBanner/HeroBanner";
import BrandCategoryGrid from "./BrandCategoryGrid/BrandCategoryGrid";
import PopularCategoryGrid from "./PopularCategoryGrid/PopularCategoryGrid";
import MetaHeader from "./MetaHeader/MetaHeader";

export default function Home() {
  return (
    <>
    <MetaHeader />
      <section className="hero-section">
        <HeroBanner />
      </section>
        <BrandCategoryGrid columns={4} maxBrands={12} />
        <PopularCategoryGrid columns={4} maxBrands={12} />
    </>
  );
}
