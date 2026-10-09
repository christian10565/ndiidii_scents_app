import { Link } from 'react-router-dom';
import { COLLECTIONS } from '../config/site.js';
import { ArrowRight } from './Icons.jsx';

export default function FeaturedCollections() {
  return (
    <section className="collections">
      <div className="container">
        <div className="section-head section-head--split">
          <h2 className="serif section-title">Shop the Collection</h2>
          <Link to="/shop" className="btn btn--ghost-light btn--sm">
            View All
          </Link>
        </div>

        <div className="collections__grid">
          {COLLECTIONS.map((c, i) => (
            <Link
              to={c.to}
              key={c.title}
              className={`ccard ccard--${i + 1}`}
              style={{ backgroundImage: `url(${c.image}), var(--card-fallback-${i + 1})` }}
            >
              <div className="ccard__body">
                <h3 className="serif">{c.title}</h3>
                <p>{c.text}</p>
                <span className="ccard__cta">
                  Shop the Edit <ArrowRight width={12} height={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
