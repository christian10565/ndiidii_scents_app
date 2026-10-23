import { readFileSync } from 'fs';

// Check current sheet state for all 10 next-batch perfumes
const fs = require('fs');
const path = '/c/Users/Cicada/Desktop/code/Ndiidii_proj/ndiidii_scents_app/ndiidii-next/data/next-batch.json';
const batch = JSON.parse(fs.readFileSync(path, 'utf8'));
console.log('=== next-batch.json (source) ===');
for (const r of batch) {
  console.log(`${r.id}: ${r.brand} | ${r.name} | gender=${r.gender} | tier=${r.tier} | season="${r.season}" | extra.Occasion="${r.extra.Occasion}"`);
}
