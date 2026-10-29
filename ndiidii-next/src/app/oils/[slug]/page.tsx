import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatNaira } from '@/lib/format';
import { BOX_SIZE, OIL_FORMATS, OIL_TYPE_LABELS, oilSetPrice } from '@/lib/store.config';
import { getOils } from '@/lib/catalog';
import Monogram from '@/components/Monogram';

/**
 * Perfume oil detail.
 *
 * Oils are only sold in sets of four, so there is no add-to-cart here — the
 * action is a handoff to the oil builder with this oil pre-picked.
 *
 * There is deliberately NO fallback to `getPerfume(slug)`. Under the old model
 * any perfume with `tier === null` (325 rows) rendered here as an oil and was
 * charged the oil price. Oils come from the oils tab or they 404.
 *
 * No image either: oil photography is a copyright risk for the client, so this
 * page shows a monogram and a text-only price table.
 */
export async function generateStaticParams() {
  const oils = await getOils();
  return oils.map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const o = (await getOils()).find((x) => x.slug === slug);
  if (!o) return { title: 'Not found — Ndiidii Scents' };
  const type = o.category ? OIL_TYPE_LABELS[o.category] : 'Perfume oil';
  return {
    title: `${o.name} — Ndiidii Scents`,
    description: `${type} perfume oil${o.brand ? ` from ${o.brand}` : ''}. Sold as a set of ${BOX_SIZE} bottles.`,
  };
}

/** `params` is URL data — read it inside a boundary so the shell stays instant. */
export default function OilPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="container pdp" style={{ minHeight: '70vh' }} />}>
      <OilBody params={params} />
    </Suspense>
  );
}

async function OilBody({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const oil = (await getOils()).find((o) => o.slug === slug);
  if (!oil) notFound();

  const type = oil.category;
  const builderHref = `/collection-builder/oils?add=${encodeURIComponent(oil.slug)}${
    type ? `&type=${type}` : ''
  }`;

  return (
    <div className="container pdp">
      <nav className="pdp__crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/collection-builder/oils">Perfume Oils</Link> /{' '}
        <span>{oil.name}</span>
      </nav>

      <div className="pdp__grid">
        <div className="pdp__img">
          <Monogram name={oil.name} className="dnoimg dnoimg--pdp" />
        </div>

        <div className="pdp__info">
          {oil.brand && <p className="pdp__brand serif">{oil.brand}</p>}
          <h1 className="serif pdp__name">{oil.name}</h1>

          <div className="pdp__meta">
            {type && <span className="pdp__oil-category">{OIL_TYPE_LABELS[type]}</span>}
            <span className={`pdp__stock ${oil.inStock ? 'in' : 'out'}`}>
              {oil.inStock ? 'In stock' : 'Out of stock'}
            </span>
          </div>

          <p className="pdp__desc">
            Perfume oil, sold as a set of {BOX_SIZE} bottles. Sets are built one collection type
            at a time — Designer and Niche never mix.
          </p>

          {type && (
            <div className="pdp__oilprices">
              <p className="pdp__oilprices-title eyebrow">Price per set of {BOX_SIZE}</p>
              <ul>
                {OIL_FORMATS.map((f) => (
                  <li key={f.value}>
                    <span>{f.label}</span>
                    <strong className="serif">{formatNaira(oilSetPrice(type, f.value))}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pdp__cart-panel">
            <p className="pdp__cart-panel-title">Sold in sets only</p>
            <p className="pdp__cart-panel-sub">
              Pick {oil.name} plus three more {type ? OIL_TYPE_LABELS[type] : 'oils'} in the builder.
            </p>
            <Link href={builderHref} className="btn btn--white pdp__buy-cta">
              Build a set with this oil
            </Link>
            <p className="pdp__cart-panel-hint">
              Browse all oils in the{' '}
              <Link href="/collection-builder/oils" className="link-red">
                Oil Collection Builder
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
