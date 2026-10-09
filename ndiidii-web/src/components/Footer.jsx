import { Link } from 'react-router-dom';
import { FEATURES, FOOTER } from '../config/site.js';
import { InstagramIcon, WhatsappIcon, XIcon } from './Icons.jsx';

const SOCIAL_ICONS = { instagram: InstagramIcon, x: XIcon, whatsapp: WhatsappIcon };

export default function Footer() {
  const onNewsletter = (e) => {
    e.preventDefault();
    // TODO: connect to an email service (Mailchimp, Resend, etc.). Not wired yet.
  };

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <p className="footer__logo serif">NDIIDII SCENTS</p>
          <p className="footer__blurb">{FOOTER.blurb}</p>
          <div className="footer__social">
            {FOOTER.socials.map((s) => {
              const Icon = SOCIAL_ICONS[s.icon];
              return (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                  <Icon />
                </a>
              );
            })}
          </div>
        </div>

        {FOOTER.columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="footer__title">{col.title}</h3>
            <ul>
              {col.links
                .filter((l) => !l.feature || FEATURES[l.feature])
                .map((l) => (
                  <li key={l.label}>
                    <Link to={l.to}>{l.label}</Link>
                  </li>
                ))}
            </ul>
          </nav>
        ))}

        <div>
          <h3 className="footer__title">Newsletter</h3>
          <p className="footer__news-text">New pours, first.</p>
          <form className="footer__form" onSubmit={onNewsletter}>
            <label className="sr-only" htmlFor="newsletter-email">
              Email
            </label>
            <input id="newsletter-email" type="email" placeholder="Email" required />
            <button type="submit">Join</button>
          </form>
        </div>
      </div>

      <div className="container">
        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} Ndiidii Scents.</p>
          <ul className="footer__pay">
            {FOOTER.payments.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
