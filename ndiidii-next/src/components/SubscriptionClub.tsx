import Link from 'next/link';
import { SUBSCRIPTION_PLANS } from '@/config/site';

export default function SubscriptionClub() {
  return (
    <section className="section subs">
      <div className="container">
        <div className="section-head section-head--split">
          <div>
            <p className="eyebrow">Subscription club</p>
            <h2 className="serif section-title">Never Run Out of Signature</h2>
          </div>
          <Link href="/subscription" className="btn btn--ghost-dark">
            See Plans
          </Link>
        </div>

        <div className="plans">
          {SUBSCRIPTION_PLANS.map((p) => (
            <article key={p.key} className={`plan ${p.popular ? 'plan--light' : 'plan--dark'}`}>
              {p.popular && <span className="plan__badge">Most popular</span>}
              <p className="eyebrow plan__label">{p.label}</p>
              <p className="plan__price serif">
                {p.price}
                <small>{p.per}</small>
              </p>
              <p className="plan__mix">{p.mix}</p>
              <p className="plan__text">{p.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
