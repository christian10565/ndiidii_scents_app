import { HOW_IT_WORKS } from '../config/site.js';

export default function HowItWorks() {
  return (
    <section className="how" aria-label="How it works">
      <ol className="container how__grid">
        {HOW_IT_WORKS.map((s) => (
          <li className="how__step" key={s.n}>
            <span className="how__n serif">{s.n}</span>
            <h3 className="serif how__title">{s.title}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
