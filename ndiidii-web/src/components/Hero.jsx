import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HERO_SLIDES } from '../config/site.js';

const INTERVAL_MS = 6000;

export default function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || HERO_SLIDES.length < 2) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % HERO_SLIDES.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {HERO_SLIDES.map((s, i) => (
        <div
          key={i}
          className={`hero__slide ${i === index ? 'is-active' : ''}`}
          style={{ backgroundImage: `url(${s.image}), var(--hero-fallback)` }}
          aria-hidden={i !== index}
        >
          <div className="hero__shade" />
          <div className="hero__content">
            <p className="eyebrow">{s.eyebrow}</p>
            <h1 className="serif hero__title">
              {s.titleTop}
              <br />
              <em>{s.titleItalic}</em>
            </h1>
            <p className="hero__text">{s.text}</p>
            <div className="hero__cta">
              <Link to="/collection-builder" className="btn btn--white" tabIndex={i === index ? 0 : -1}>
                Build Your Collection
              </Link>
              <Link to="/shop" className="btn btn--ghost-light" tabIndex={i === index ? 0 : -1}>
                Shop All Scents
              </Link>
            </div>
          </div>
        </div>
      ))}

      <div className="hero__dots" role="tablist" aria-label="Choose slide">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === index}
            aria-label={`Slide ${i + 1}`}
            className={i === index ? 'is-active' : ''}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}
