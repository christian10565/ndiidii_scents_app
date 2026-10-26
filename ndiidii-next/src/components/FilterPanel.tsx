'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { SHOP } from '@/config/site';
import { formatNaira } from '@/lib/format';
import { TIER_BOX_PRICE_NGN, BOX_SIZE } from '@/lib/store.config';
import { toggle, type Filters } from '@/lib/shopQuery';
import { ArrowRight, ChevronDown, ChevronLeft, CloseIcon, FilterIcon } from './Icons';
import type { BrandCount } from '@/lib/catalog';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <section className="fsec">
      <button className="fsec__head" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <span>{title}</span>
        <ChevronDown className={open ? 'is-flipped' : ''} />
      </button>
      {open && (
        <div id={id} className="fsec__body">
          {children}
        </div>
      )}
    </section>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="check">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <span className="check__box" aria-hidden="true" />
      <span className="check__label">{children}</span>
    </label>
  );
}

const GENDERS = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'unisex', label: 'Unisex' },
];

/** How many notes show before "Show more". */
const NOTES_PREVIEW = 12;

/**
 * `filters` is the object from lib/shopQuery.ts; `onChange(nextFilters)` writes it back to the URL.
 * Tier prices come from store.config so they are only ever changed in one place.
 */
export default function FilterPanel({
  filters,
  onChange,
  activeCount,
  onClose,
  brands,
  notes,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  activeCount: number;
  onClose: () => void;
  brands: BrandCount[];
  notes: string[];
}) {
  const price = (t: string) => formatNaira(TIER_BOX_PRICE_NGN[Number(t) as 1 | 2 | 3]);

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  // Notes are a long list, so only a preview shows until expanded. Selected notes
  // are always kept visible, otherwise a checked note could be hidden behind
  // "Show more" and look like it had been dropped.
  const [notesExpanded, setNotesExpanded] = useState(false);
  const selectedNotes = notes.filter((n) => filters.notes.some((x) => x.toLowerCase() === n.toLowerCase()));
  const previewNotes = [...new Set([...notes.slice(0, NOTES_PREVIEW), ...selectedNotes])].sort((a, b) =>
    a.localeCompare(b),
  );
  const shownNotes = notesExpanded ? notes : previewNotes;
  const hiddenNoteCount = notes.length - previewNotes.length;

  // Brands that have perfumes, most stocked first. Selected brands are pinned so they never disappear.
  const all = brands.filter((b) => b.perfumes > 0).sort((a, b) => b.perfumes - a.perfumes);
  const isSel = (name: string) => filters.brand.some((x) => x.toLowerCase() === name.toLowerCase());
  const top = all.slice(0, SHOP.brandsShown);
  const pinned = all.filter((b) => isSel(b.brand) && !top.includes(b));
  const unknown = filters.brand.filter((x) => !all.some((b) => b.brand.toLowerCase() === x.toLowerCase()));
  const shown = [...pinned, ...top];

  return (
    <div className="fpanel">
      <div className="fpanel__head">
        <FilterIcon />
        <span className="fpanel__title">Filter</span>
        <button className="fpanel__collapse" onClick={onClose} aria-label="Hide filters">
          <ChevronLeft />
        </button>
        <button
          className="fpanel__clear"
          disabled={activeCount === 0}
          onClick={() => set({ stock: [], tier: [], gender: [], notes: [], brand: [] })}
        >
          Clear all <CloseIcon width={14} height={14} />
        </button>
      </div>

      <Section title="Availability">
        <Check checked={filters.stock.includes('in')} onChange={() => set({ stock: toggle(filters.stock, 'in') })}>
          In Stock
        </Check>
        <Check checked={filters.stock.includes('out')} onChange={() => set({ stock: toggle(filters.stock, 'out') })}>
          Out of Stock
        </Check>
      </Section>

      <Section title="Tier">
        <Check checked={filters.tier.length === 0} onChange={() => set({ tier: [] })}>
          All Tiers
        </Check>
        {['1', '2', '3'].map((t) => (
          <Check key={t} checked={filters.tier.includes(t)} onChange={() => set({ tier: toggle(filters.tier, t) })}>
            Tier {t}
            {price(t) && (
              <>
                {' — '}
                {price(t)}
                {/* The tier price is per BOX, not per decant — say so, or ₦50,000
                    reads like a single bottle. */}
                <span className="fsec__unit">
                  {' '}
                  box of {BOX_SIZE}
                </span>
              </>
            )}
          </Check>
        ))}
      </Section>

      <Section title="Gender">
        <Check checked={filters.gender.length === 0} onChange={() => set({ gender: [] })}>
          All
        </Check>
        {GENDERS.map((g) => (
          <Check key={g.value} checked={filters.gender.includes(g.value)} onChange={() => set({ gender: toggle(filters.gender, g.value) })}>
            {g.label}
          </Check>
        ))}
      </Section>

      <Section title="Collection">
        <Check checked={filters.collection === null} onChange={() => set({ collection: null })}>
          All Scents
        </Check>
        <Check checked={filters.collection === 'perfumes'} onChange={() => set({ collection: filters.collection === 'perfumes' ? null : 'perfumes' })}>
          Perfumes
        </Check>
        <Check checked={filters.collection === 'oils'} onChange={() => set({ collection: filters.collection === 'oils' ? null : 'oils' })}>
          Perfume Oils
        </Check>
      </Section>

      <Section title="Notes">
        <Check checked={filters.notes.length === 0} onChange={() => set({ notes: [] })}>
          All Notes
        </Check>
        <div className="fnotes">
          {shownNotes.map((n) => (
            <Check
              key={n}
              checked={filters.notes.some((x) => x.toLowerCase() === n.toLowerCase())}
              onChange={() => set({ notes: toggle(filters.notes, n) })}
            >
              {n}
            </Check>
          ))}
        </div>
        {notes.length > NOTES_PREVIEW && (
          <button className="fnotes__toggle" onClick={() => setNotesExpanded((o) => !o)} aria-expanded={notesExpanded}>
            {notesExpanded ? (
              <>
                Show less <ArrowRight width={13} height={13} style={{ transform: 'rotate(180deg)' }} />
              </>
            ) : (
              <>
                Show more <span className="fnotes__count">({hiddenNoteCount})</span>
                <ArrowRight width={13} height={13} style={{ transform: 'rotate(90deg)' }} />
              </>
            )}
          </button>
        )}
      </Section>

      <Section title="Brand">
        <Check checked={filters.brand.length === 0} onChange={() => set({ brand: [] })}>
          All Brands
        </Check>
        {shown.map((b) => (
          <Check key={b.brand} checked={isSel(b.brand)} onChange={() => set({ brand: toggle(filters.brand, b.brand) })}>
            {b.brand}
          </Check>
        ))}
        {unknown.map((name) => (
          <Check key={name} checked onChange={() => set({ brand: toggle(filters.brand, name) })}>
            {name}
          </Check>
        ))}
        <Link href="/brands" className="fpanel__all-brands">
          View All Brands, A–Z <ArrowRight width={13} height={13} />
        </Link>
      </Section>
    </div>
  );
}
