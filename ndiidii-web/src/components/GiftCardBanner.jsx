import { Link } from 'react-router-dom';
import { ArrowRight } from './Icons.jsx';

export default function GiftCardBanner() {
  return (
    <section className="gift">
      <div className="gift__art" style={{ backgroundImage: 'url(/images/gift-card.jpg), var(--gift-fallback)' }} aria-hidden="true" />
      <div className="container gift__inner">
        <div className="gift__copy">
          <p className="eyebrow">The perfect gift</p>
          <h2 className="serif gift__title">
            Give the Gift of <em>Choice</em>
          </h2>
          <p className="gift__text">Let your loved ones explore and choose their signature scents.</p>
          <Link to="/gift-cards" className="btn btn--white btn--caps">
            Explore Gift Card <ArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}
