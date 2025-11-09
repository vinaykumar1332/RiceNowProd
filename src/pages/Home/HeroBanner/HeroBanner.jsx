import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const [slides, setSlides] = useState(Array.isArray(initialSlides) ? initialSlides : []);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // timers / refs
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  const wrapperRef = useRef(null);

  // touch swipe tracking
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const touchStartTime = useRef(0);
  const isTouching = useRef(false);
  const minSwipeDistance = 50; // px
  const maxSwipeTime = 700; // ms

  // clamp helper
  const clamp = useCallback((i) => {
    if (!slides || slides.length === 0) return 0;
    const n = slides.length;
    // ensure in [0, n-1] using positive modulo
    return ((i % n) + n) % n;
  }, [slides]);

  // fetch remote slides (safe)
  useEffect(() => {
    if (!fetchUrl) return undefined;
    mountedRef.current = true;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(fetchUrl, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.slides ?? data?.data ?? [];
        if (mountedRef.current && Array.isArray(list)) {
          setSlides(list);
          setIndex(0);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          // keep original slides if fetch fails; log for debug
          // console.warn('HeroBanner fetch failed', err);
        }
      }
    })();

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [fetchUrl]);

  // navigation helpers
  const goTo = useCallback((i) => {
    setIndex((prev) => {
      const next = clamp(i);
      // reset autoplay timer when user manually navigates
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return next;
    });
  }, [clamp]);

  const next = useCallback(() => { goTo(index + 1); }, [index, goTo]);
  const prev = useCallback(() => { goTo(index - 1); }, [index, goTo]);

  // autoplay effect (single timer, respects pause flag)
  useEffect(() => {
    if (!slides || slides.length <= 1) return undefined;
    if (isPaused) return undefined;

    // clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setIndex((i) => clamp(i + 1));
      timerRef.current = null;
    }, Math.max(300, Number(interval) || 5000));

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [index, isPaused, slides, interval, clamp]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // touch handlers using move detection (more robust than only start/end)
  const onTouchStart = useCallback((e) => {
    setIsPaused(true);
    isTouching.current = true;
    touchStartTime.current = Date.now();
    const t = e.touches?.[0] ?? e.changedTouches?.[0];
    touchStartX.current = t ? t.clientX : 0;
    touchCurrentX.current = touchStartX.current;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!isTouching.current) return;
    const t = e.touches?.[0] ?? e.changedTouches?.[0];
    touchCurrentX.current = t ? t.clientX : touchCurrentX.current;
  }, []);

  const onTouchEnd = useCallback((e) => {
    setIsPaused(false);
    if (!isTouching.current) return;
    isTouching.current = false;
    const endTime = Date.now();
    const dt = endTime - (touchStartTime.current || endTime);
    const dx = (touchCurrentX.current || 0) - (touchStartX.current || 0);
    if (Math.abs(dx) >= minSwipeDistance && dt <= maxSwipeTime) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = 0;
    touchCurrentX.current = 0;
    touchStartTime.current = 0;
  }, [next, prev]);

  // mouse / focus interactions pause autoplay
  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return undefined;

    const onEnter = () => setIsPaused(true);
    const onLeave = () => setIsPaused(false);
    const onFocusIn = () => setIsPaused(true);
    const onFocusOut = (e) => {
      // resume only when focus leaves the banner
      if (!node.contains(e.relatedTarget)) setIsPaused(false);
    };

    node.addEventListener('mouseenter', onEnter);
    node.addEventListener('mouseleave', onLeave);
    node.addEventListener('focusin', onFocusIn);
    node.addEventListener('focusout', onFocusOut);

    return () => {
      node.removeEventListener('mouseenter', onEnter);
      node.removeEventListener('mouseleave', onLeave);
      node.removeEventListener('focusin', onFocusIn);
      node.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // keyboard navigation — only when banner has focus (aria-roledescription carousel)
  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return undefined;

    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      if (e.key === 'Home') { e.preventDefault(); goTo(0); }
      if (e.key === 'End') { e.preventDefault(); goTo((slides?.length ?? 1) - 1); }
    };

    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener('keydown', onKey);
  }, [next, prev, goTo, slides]);

  // If no slides, render nothing
  if (!slides || slides.length === 0) return null;

  // Active slide only for AnimatePresence (faster)
  const activeSlide = slides[clamp(index)];

  return (
    <header
      ref={wrapperRef}
      className={`hero-banner ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onMouseLeave={() => setIsPaused(false)}
      tabIndex={0} // allow keyboard when focused
      aria-roledescription="carousel"
      aria-label="Featured content"
    >
      <div className="slides-wrapper" role="region" aria-live={isPaused ? 'off' : 'polite'}>
        <AnimatePresence initial={false} mode="wait">
          <motion.section
            key={activeSlide.id ?? index}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.995 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="slide"
            style={{ backgroundImage: `url(${activeSlide.image})` }}
            aria-hidden="false"
            aria-label={activeSlide.title || `Slide ${index + 1}`}
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
                {activeSlide.kicker && (
                  <motion.p className="kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
                    {activeSlide.kicker}
                  </motion.p>
                )}

                <motion.h2
                  className="title"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.14 }}
                >
                  {activeSlide.title}
                </motion.h2>

                {activeSlide.subtitle && (
                  <motion.p
                    className="subtitle"
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.18 }}
                  >
                    {activeSlide.subtitle}
                  </motion.p>
                )}

                <motion.div className="cta-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }}>
                  {activeSlide.ctaHref && (
                    <motion.a
                      className="cta"
                      href={activeSlide.ctaHref}
                      whileHover={{ y: -3, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {activeSlide.ctaText || 'Learn More'}
                    </motion.a>
                  )}
                  {activeSlide.secondary && (
                    <motion.a className="secondary" href={activeSlide.secondary.href} whileHover={{ y: -2 }}>
                      {activeSlide.secondary.label}
                    </motion.a>
                  )}
                </motion.div>
              </motion.div>

              {activeSlide.right && <div className="slide-right" aria-hidden="true">{activeSlide.right}</div>}
            </div>
          </motion.section>
        </AnimatePresence>
      </div>

      {/* bullets */}
      <nav className="bullets" role="tablist" aria-label="Slides">
        {slides.map((_, i) => (
          <button
            key={`dot-${i}`}
            className={`bullet ${i === clamp(index) ? 'active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-pressed={i === clamp(index)}
            role="tab"
            tabIndex={0}
          />
        ))}
      </nav>

      {/* visually-hidden announce for screen readers */}
      <div className="sr-only" aria-live="polite">
        Slide {clamp(index) + 1} of {slides.length}: {slides[clamp(index)].title || ''}
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
