import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FEATURES } from '../config/site.js';
import { useApi } from '../lib/useApi.js';
import { ChevronLeft, ChevronRight, HeartIcon } from './Icons.jsx';
import ProductImage from './ProductImage.jsx';

const PARAMS = { sort: 'newest', limit: 10, inStock: true };

export default function NewInStore() {
  const { status, data } = useApi('/perfumes', PARAMS);
  const rail = useRef(null);
  const items = data?.items ?? [];

  const scrollBy = (dir) => {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className="section new-in">
      <div className="container">
        <div className="section-head section-head--center">
          <div className="new-in__title">
            <button className="round-btn" onClick={() => scrollBy(-1)} aria-label="Previous">
              <ChevronLeft />
            </button>
            <h2 className="serif">New in Store</h2>
            <button className="round-btn" onClick={() => scrollBy(1)} aria-label="Next">
              <ChevronRight />
            </button>
          </div>
          <Link to="/shop?sort=newest" className="link-red">
            View all
          </Link>
        </div>

        <div className="rail" ref={rail}>
          {status === 'loading' &&
            Array.from({ length: 5 }, (_, i) => (
              <div className="rail__item" key={i} aria-hidden="true">
                <div className="skeleton skeleton--img" />
                <div className="skeleton skeleton--line" />
              </div>
            ))}

          {status === 'error' && <p className="empty">We couldn't load the latest scents. Please refresh.</p>}
          {status === 'ready' && items.length === 0 && <p className="empty">New scents are on the way.</p>}

          {items.map((p) => (
            <article className="rail__item product" key={p.id}>
              {FEATURES.wishlist && (
                <button className="product__heart" aria-label={`Add ${p.name} to wishlist`}>
                  <HeartIcon width={14} height={14} />
                </button>
              )}
              <Link to={`/perfumes/${p.slug}`} className="product__link">
                <div className="product__img">
                  <ProductImage src={p.imageUrl} alt={p.name} />
                </div>
                <h3 className="product__name">{p.name}</h3>
                {p.brand && <p className="product__brand">{p.brand}</p>}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
