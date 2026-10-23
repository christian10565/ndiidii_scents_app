import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const DATA = join(process.cwd(), 'data');
const files = readdirSync(DATA).filter(f => f.endsWith('.json'));
console.log('data json files:', files);

const um = JSON.parse(readFileSync(join(DATA, 'upload-map.json'), 'utf8'));
console.log('upload-map entries:', um.length);
console.log('upload-map first-entry keys:', Object.keys(um[0]));
const keys = new Set();
for (const r of um) for (const k of Object.keys(r)) keys.add(k);
console.log('all upload-map keys:', [...keys]);
const withCloud = um.filter(r => r.cloudinaryUrl);
console.log('upload-map with cloudinaryUrl:', withCloud.length);
const withPublicId = um.filter(r => r.cloudinaryPublicId);
console.log('upload-map with cloudinaryPublicId:', withPublicId.length);
if (withCloud.length) console.log('sample:', JSON.stringify(withCloud[0]));

const mm = JSON.parse(readFileSync(join(DATA, 'match-map.json'), 'utf8'));
console.log('match-map === upload-map?', JSON.stringify(mm) === JSON.stringify(um));
