import { BRAND_STATEMENT as B } from '../config/site.js';

export default function BrandStatement() {
  return (
    <section className="statement">
      <div className="container statement__inner">
        <p className="eyebrow">{B.eyebrow}</p>
        <h2 className="serif statement__title">
          {B.titleStart} <em>{B.titleItalic}</em>
        </h2>
        <p className="statement__text">{B.text}</p>
      </div>
    </section>
  );
}
