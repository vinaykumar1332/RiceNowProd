import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import slidesJson from './HeroSlide.json';
import './HeroBanner.css';

export default function HeroBanner({
  fetchUrl = null,
  slides: initialSlides = slidesJson,
  interval = 5000,
  className = '',
}) {
  const [slides, setSlides] = useState(initialSlides || []);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  // Touch handling refs
  const touchStartX = useRef(null);
  const touchStartTime = useRef(null);
  const minSwipeDistance = 50; // px
  const maxSwipeTime = 600; // ms

  // Fetch remote slides if fetchUrl provided
  useEffect(() => {
    if (!fetchUrl) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error('Failed to fetch slides');
        const data = await res.json();
        if (!cancelled) {
          setSlides(Array.isArray(data) ? data : data.slides || []);
          setIndex(0);
        }
      } catch (e) {
        console.error('HeroBanner fetch error:', e);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchUrl]);

  // autoplay
  useEffect(() => {
    if (!slides || slides.length <= 1) return;
    if (isPaused) return;
    timerRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, interval);
    return () => clearTimeout(timerRef.current);
  }, [index, isPaused, slides, interval]);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const goTo = (i) => {
    if (!slides || slides.length === 0) return;
    clearTimeout(timerRef.current);
    const nextIndex = ((i % slides.length) + slides.length) % slides.length;
    setIndex(nextIndex);
  };
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // Touch handlers for mobile swipe
  function handleTouchStart(e) {
    setIsPaused(true);
    touchStartTime.current = Date.now();
    if (e.touches && e.touches.length) {
      touchStartX.current = e.touches[0].clientX;
    } else if (e.changedTouches && e.changedTouches.length) {
      touchStartX.current = e.changedTouches[0].clientX;
    } else {
      touchStartX.current = null;
    }
  }

  function handleTouchEnd(e) {
    setIsPaused(false);
    if (touchStartX.current == null) return;
    const touchEndX = (e.changedTouches && e.changedTouches[0] && e.changedTouches[0].clientX) || null;
    const dt = Date.now() - (touchStartTime.current || 0);
    if (touchEndX === null) return;
    const dx = touchEndX - touchStartX.current;
    if (Math.abs(dx) > minSwipeDistance && dt < maxSwipeTime) {
      if (dx < 0) {
        next();
      } else {
        prev();
      }
    }
    touchStartX.current = null;
    touchStartTime.current = null;
  }

  // keyboard left/right navigation (optional for accessibility)
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, slides]);

  if (!slides || slides.length === 0) return null;

  return (
    <header
      className={`hero-banner ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="slides-wrapper" aria-roledescription="carousel">
        <AnimatePresence initial={false} mode="wait">
          {slides.map((slide, i) =>
            i === index ? (
              <motion.section
                key={slide.id ?? i}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="slide"
                style={{ backgroundImage: `url(${slide.image})` }}
                aria-hidden={i === index ? 'false' : 'true'}
              >
                <div className="slide-overlay" />

                {/* Animated content container */}
                <div className="slide-content">
                  <motion.div
                    className="slide-text"
                    initial={{ y: 18, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ duration: 0.6, delay: 0.08 }}
                  >
                    {slide.kicker && (
                      <motion.p className="kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
                        {slide.kicker}
                      </motion.p>
                    )}

                    <motion.h2
                      className="title"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.14 }}
                    >
                      {slide.title}
                    </motion.h2>

                    {slide.subtitle && (
                      <motion.p
                        className="subtitle"
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.18 }}
                      >
                        {slide.subtitle}
                      </motion.p>
                    )}

                    <motion.div className="cta-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }}>
                      {slide.ctaHref && (
                        <motion.a
                          className="cta"
                          href={slide.ctaHref}
                          whileHover={{ y: -3, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {slide.ctaText || 'Learn More'}
                        </motion.a>
                      )}
                      {slide.secondary && (
                        <motion.a className="secondary" href={slide.secondary.href} whileHover={{ y: -2 }}>
                          {slide.secondary.label}
                        </motion.a>
                      )}
                    </motion.div>
                  </motion.div>

                  {/* optional right content */}
                  {slide.right && <div className="slide-right">{slide.right}</div>}
                </div>
              </motion.section>
            ) : null
          )}
        </AnimatePresence>
      </div>

      {/* Bullets indicator (active shows accent color) */}
      <nav className="bullets" role="tablist" aria-label="Slides">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`bullet ${i === index ? 'active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-pressed={i === index}
            role="tab"
          />
        ))}
      </nav>

      {/* Announce current slide for screen readers */}
      <div className="sr-only" aria-live="polite">
        Slide {index + 1} of {slides.length}: {slides[index].title}
      </div>
    </header>
  );
}

HeroBanner.propTypes = {
  fetchUrl: PropTypes.string,
  slides: PropTypes.array,
  interval: PropTypes.number,
  className: PropTypes.string,
};
