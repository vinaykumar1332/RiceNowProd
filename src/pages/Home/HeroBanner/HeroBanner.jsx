import React, { useCallback, useEffect, useRef, useState } from "react";
import "./HeroBanner.css";
import { slides } from "../../../utils/slideHelper"; // adjust to your project path

const SLIDE_DURATION_MS = 5000;

export default function HeroBanner() {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [tick, setTick] = useState(0); // used to restart indicator animation
  const slideCount = slides.length;

  const autoRef = useRef(null);
  const liveRef = useRef(null);
  const rootRef = useRef(null);

  // swipe support
  const touchStartX = useRef(null);

  // goTo with safe wrap
  const goTo = useCallback((i) => {
    const next = ((i % slideCount) + slideCount) % slideCount;
    setIndex(next);
    setTick((t) => t + 1);
    if (liveRef.current) {
      liveRef.current.textContent = `Slide ${next + 1} of ${slideCount}: ${slides[next].quote}`;
    }
  }, [slideCount]);

  const next = useCallback(() => goTo(index + 1), [index, goTo]);
  const prev = useCallback(() => goTo(index - 1), [index, goTo]);

  // auto-advance
  useEffect(() => {
    if (autoRef.current) clearInterval(autoRef.current);
    if (!isPaused) {
      autoRef.current = setInterval(() => {
        setIndex((i) => {
          const n = (i + 1) % slideCount;
          setTick((t) => t + 1);
          if (liveRef.current) {
            liveRef.current.textContent = `Slide ${n + 1} of ${slideCount}: ${slides[n].quote}`;
          }
          return n;
        });
      }, SLIDE_DURATION_MS);
    }
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
    };
  }, [isPaused, slideCount]);

  // keyboard
  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // pause/resume helpers
  const handlePause = () => {
    setIsPaused(true);
    rootRef.current?.classList.add("paused");
  };
  const handleResume = () => {
    setIsPaused(false);
    rootRef.current?.classList.remove("paused");
  };

  // touch handlers for swipe (fixed: use changedTouches, preventDefault on move)
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches?.[0]?.clientX ?? null;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (touchStartX.current == null) return;
    const currentX = e.touches?.[0]?.clientX ?? null;
    if (currentX && Math.abs(currentX - touchStartX.current) > 10) {
      e.preventDefault(); // Prevent scroll during swipe
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current == null) return;
    const endX = e.changedTouches?.[0]?.clientX ?? touchStartX.current; // Fallback to start if no change
    const diff = touchStartX.current - endX;
    const threshold = 40; // min px swipe
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // left swipe -> next
        next();
      } else {
        // right swipe -> prev
        prev();
      }
    }
    touchStartX.current = null;
  }, [next, prev]);

  return (
    <section
      className="rn-hero"
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="RiceNow hero carousel"
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onFocus={handlePause}
      onBlur={handleResume}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="rn-sr" aria-live="polite" ref={liveRef}>
        {`Slide ${index + 1} of ${slideCount}: ${slides[index].quote}`}
      </div>

      {/* Slides */}
      <div className="rn-slider" role="group" aria-label="Slides">
        {slides.map((s, i) => {
          const active = i === index;
          return (
            <div
              key={s.id}
              id={`slide-${s.id}`}
              className={`rn-slide ${active ? "active" : ""}`}
              aria-hidden={!active}
            >
              {/* use background image for cover */}
              <div
                className="rn-slide__bg"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.28), rgba(0,0,0,0.46)), url(${s.image})`,
                }}
                role="img"
                aria-label={s.quote}
              />

              <div className="rn-slide__inner">
                <blockquote className="rn-quote" aria-hidden={false}>
                  <p className="rn-quote__text">{s.quote}</p>
                </blockquote>

                <a
                  className="rn-cta"
                  href={s.route || "/products"}
                  aria-label={`${s.buttonText} - view products`}
                >
                  {s.buttonImage && (
                    <img
                      src={s.buttonImage}
                      alt=""
                      aria-hidden="true"
                      width="20"
                      height="20"
                      className="rn-cta__icon"
                      loading="lazy"
                    />
                  )}
                  <span className="rn-cta__text">{s.buttonText}</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <button
        className="rn-nav rn-nav--prev"
        onClick={prev}
        aria-label="Previous slide"
      >
        ‹
      </button>
      <button
        className="rn-nav rn-nav--next"
        onClick={next}
        aria-label="Next slide"
      >
        ›
      </button>

      {/* Indicators */}
      <div className="rn-indicators" role="tablist" aria-label="Slide indicators">
        {slides.map((s, i) => {
          const active = i === index;
          return (
            <button
              key={s.id}
              className={`rn-indicator ${active ? "active" : ""}`}
              role="tab"
              aria-selected={active}
              onClick={() => goTo(i)}
              title={`Go to slide ${i + 1}`}
            >
              <span className="rn-indicator__dot" />
              <span
                className="rn-indicator__progress"
                // key/tick used to restart animation when slide changes
                key={`${tick}-${i}`}
                style={{
                  animationDuration: `${SLIDE_DURATION_MS}ms`,
                  animationPlayState: isPaused || !active ? "paused" : "running",
                }}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}