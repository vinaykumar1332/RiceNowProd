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

  if (!slides || slides.length === 0) return null;

  return (
    <div className='heroBanner-container'>
    <header
      className={`hero-banner relative w-full overflow-hidden ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="slides-wrapper">
        <AnimatePresence initial={false} mode="wait">
          {slides.map((slide, i) =>
            i === index ? (
              <motion.div
                key={slide.id ?? i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="slide"
                style={{ backgroundImage: `url(${slide.image})` }}
              >
                <div className="slide-overlay" />
                <div className="slide-content">
                  <div className="slide-text">
                    {slide.kicker && <p className="kicker">{slide.kicker}</p>}
                    <h2 className="title">{slide.title}</h2>
                    {slide.subtitle && <p className="subtitle">{slide.subtitle}</p>}
                    <div className="cta-row">
                      {slide.ctaHref && (
                        <a className="cta" href={slide.ctaHref}>
                          {slide.ctaText || 'Learn More'}
                        </a>
                      )}
                      {slide.secondary && (
                        <a className="secondary" href={slide.secondary.href}>
                          {slide.secondary.label}
                        </a>
                      )}
                    </div>
                  </div>

                  {slide.right && <div className="slide-right">{slide.right}</div>}
                </div>
              </motion.div>
            ) : null
          )}
        </AnimatePresence>
      </div>
<div className="control-prev">
  <button aria-label="Previous" onClick={prev} className="control-btn control-prev-btn">‹</button>
</div>

<div className="control-next">
  <button aria-label="Next" onClick={next} className="control-btn control-next-btn">›</button>
</div>

      <div className="bullets" role="tablist" aria-label="Slides">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`bullet ${i === index ? 'active' : ''}`}
            aria-pressed={i === index}
            role="tab"
          />
        ))}
      </div>
    </header>
    </div>
  );
}

HeroBanner.propTypes = {
  fetchUrl: PropTypes.string,
  slides: PropTypes.array,
  interval: PropTypes.number,
  className: PropTypes.string,
};
