import Link from 'next/link';
import { FEATURES, FOOTER } from '@/config/site';
import { InstagramIcon, WhatsappIcon, XIcon } from './Icons';
import Year from './Year';
import NewsletterForm from './NewsletterForm';

const SOCIAL_ICONS = { instagram: InstagramIcon, x: XIcon, whatsapp: WhatsappIcon };

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <p className="footer__logo serif">NDIIDII SCENTS</p>
          <p className="footer__blurb">{FOOTER.blurb}</p>
          <div className="footer__social">
            {FOOTER.socials.map((s) => {
              const Icon = SOCIAL_ICONS[s.icon as keyof typeof SOCIAL_ICONS];
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
                .filter((l) => !l.feature || FEATURES[l.feature as keyof typeof FEATURES])
                .map((l) => (
                  <li key={l.label}>
                    <Link href={l.to}>{l.label}</Link>
                  </li>
                ))}
            </ul>
          </nav>
        ))}

        <div>
          <h3 className="footer__title">Newsletter</h3>
          <p className="footer__news-text">New pours, first.</p>
          <NewsletterForm />
        </div>
      </div>

      <div className="container">
        <div className="footer__bottom">
          {/* suppressHydrationWarning: the year renders after mount, so the
              server HTML omits it — this tells React that's intentional. */}
          <p suppressHydrationWarning>© <Year /> Ndiidii Scents.</p>
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
