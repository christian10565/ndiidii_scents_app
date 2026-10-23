import { readFileSync } from 'fs';

const snap = JSON.parse(readFileSync('/c/Users/Cicada/Desktop/code/Ndiidii_proj/ndiidii_scents_app/ndiidii-next/data/catalog-snapshot.json', 'utf8')).perfumes;
const byName = new Map(snap.map(p => [p.name, p]));

console.log('=== Next 10 in snapshot ===');
for (const name of ['Queen of Arabia', 'Le Prestige Bold', 'Le Prestige King', 'Gharam', 'Kismet Magic', 'Island Vanilla Dunes', 'Sceptre Oceana', 'Cascade Blue', 'Aseel', 'Ramad Louban']) {
  const p = byName.get(name);
  if (p) {
    console.log(`\n${name} | ${p.brand}`);
    console.log('  notes.top:', p.notes?.top);
    console.log('  notes.heart:', p.notes?.heart);
    console.log('  notes.base:', p.notes?.base);
    console.log('  season:', p.season);
    console.log('  extra.Occasion:', p.extra?.Occasion);
    console.log('  inspiredBy:', p.inspiredBy);
  }
}
