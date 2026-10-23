import { readFileSync } from 'fs';
import { join } from 'path';

const DATA = join(process.cwd(), 'data');
const snap = JSON.parse(readFileSync(join(DATA, 'catalog-snapshot.json'), 'utf8'));
const rows = snap.perfumes;
const snapByName = new Map(rows.map(p => [p.name.toLowerCase(), p]));

const batch = JSON.parse(readFileSync(join(DATA, 'hermes_batch1.json'), 'utf8'));

console.log('Batch names and what the snapshot shows:');
for (const rec of batch) {
  const key = rec.name.toLowerCase();
  const snapRow = snapByName.get(key);
  if (snapRow) {
    const missing = [];
    if (!snapRow.inspiredBy) missing.push('inspiredBy');
    if (!snapRow.scentProfile) missing.push('scentProfile');
    if (!snapRow.season) missing.push('season');
    if (!snapRow.extra?.Occasion) missing.push('occasion');
    if (!snapRow.notes?.top) missing.push('topNotes');
    if (!snapRow.notes?.heart) missing.push('heartNotes');
    if (!snapRow.notes?.base) missing.push('baseNotes');
    console.log(`[${rec.brand}] ${rec.name}`);
    console.log(`  SNAPSHOT has row, missing fields: ${missing.join(', ') || 'none'}`);
  } else {
    console.log(`[${rec.brand}] ${rec.name}`);
    console.log(`  SNAPSHOT: NO ROW FOUND`);
  }
}
