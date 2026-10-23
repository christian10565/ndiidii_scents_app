import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
config();

const DATA = join(process.cwd(), 'data');
const snap = JSON.parse(readFileSync(join(DATA, 'catalog-snapshot.json'), 'utf8'));
const rows = snap.perfumes;
console.log('total:', rows.length);

const keys = new Set();
for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
console.log('columns:', [...keys].join(', '));

const withTop = rows.filter(r => r.notes && r.notes.top).length;
const withHeart = rows.filter(r => r.notes && r.notes.heart).length;
const withBase = rows.filter(r => r.notes && r.notes.base).length;
const withScent = rows.filter(r => r.scentProfile).length;
const withInspired = rows.filter(r => r.inspiredBy).length;
const withSeason = rows.filter(r => r.season).length;
const withOccasion = rows.filter(r => r.extra && r.extra.Occasion).length;

console.log('with top:', withTop, 'heart:', withHeart, 'base:', withBase);
console.log('with scentProfile:', withScent, 'inspiredBy:', withInspired, 'season:', withSeason, 'occasion:', withOccasion);

// Pick the next 10 rows that have notes but are missing the most important
// fields (inspired_by, scent_profile, season, occasion).
function hasNote(r) { return r.notes && r.notes.top && r.notes.heart && r.notes.base; }
const candidates = rows.filter(hasNote);
console.log('candidates with notes:', candidates.length);
candidates.sort((a, b) => {
  const aScore = [a.inspiredBy ? 1 : 0, a.scentProfile ? 1 : 0, a.season ? 1 : 0, a.extra && a.extra.Occasion ? 1 : 0].reduce((s, x) => s + x, 0);
  const bScore = [b.inspiredBy ? 1 : 0, b.scentProfile ? 1 : 0, b.season ? 1 : 0, b.extra && b.extra.Occasion ? 1 : 0].reduce((s, x) => s + x, 0);
  return bScore - aScore;
});
const picks = candidates.slice(0, 10);
console.log('picks:', picks.map(p => `${p.brand} | ${p.name} | inspired=${!!p.inspiredBy} scent=${!!p.scentProfile} season=${!!p.season} occ=${!!p.extra && p.extra.Occasion}`).join('\n'));

writeFileSync(join(DATA, 'next-batch.json'), JSON.stringify(picks, null, 2));
console.log('Wrote data/next-batch.json');
console.log(JSON.stringify(picks, null, 2));
