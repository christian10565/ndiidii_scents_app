import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
config();

const DATA = join(process.cwd(), 'data');
const snap = JSON.parse(readFileSync(join(DATA, 'catalog-snapshot.json'), 'utf8'));
const rows = snap.perfumes;
const snapByName = new Map(rows.map(p => [p.name.toLowerCase(), p]));

const batch = JSON.parse(readFileSync(join(DATA, 'hermes_batch1.json'), 'utf8'));

// Mirror the scan script's local logic: norm + brand match
function norm(s) { return String(s ?? '').toLowerCase().split(' ').filter(Boolean).join(' '); }
const snapByNameNorm = new Map();
for (const p of rows) {
  const key = `${norm(p.name)}|${norm(p.brand)}`;
  snapByNameNorm.set(key, p);
}
const snapByNameName = new Map(rows.map(p => [norm(p.name), p]));

console.log('Batch records vs snapshot:');
let matchedInSnap = 0, notInSnap = 0;
for (const rec of batch) {
  const bk = `${norm(rec.brand)}|${norm(rec.name)}`;
  const cx = snapByNameNorm.get(bk);
  if (cx) {
    matchedInSnap++;
    const missing = [];
    if (!cx.inspiredBy) missing.push('inspiredBy');
    if (!cx.scentProfile) missing.push('scentProfile');
    if (!cx.season) missing.push('season');
    if (!cx.extra?.Occasion) missing.push('occasion');
    if (!cx.notes?.top) missing.push('topNotes');
    if (!cx.notes?.heart) missing.push('heartNotes');
    if (!cx.notes?.base) missing.push('baseNotes');
    console.log(`[${rec.brand}] ${rec.name}`);
    console.log(`  SNAPSHOT: FOUND, missing fields: ${missing.length ? missing.join(', ') : 'none'}`);
  } else {
    notInSnap++;
    console.log(`[${rec.brand}] ${rec.name}: NOT FOUND in snapshot`);
  }
}
console.log(`\nmatchedInSnap: ${matchedInSnap}, notInSnap: ${notInSnap}`);
