import { ANNOUNCEMENTS } from '../config/site.js';

/** Scrolling red bar. The list is repeated so the loop has no gap. */
export default function AnnouncementBar() {
  const run = [...ANNOUNCEMENTS, ...ANNOUNCEMENTS, ...ANNOUNCEMENTS];
  return (
    <div className="announce" role="region" aria-label="Announcements">
      <div className="announce__track">
        {[0, 1].map((copy) => (
          <ul className="announce__group" key={copy} aria-hidden={copy === 1}>
            {run.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
