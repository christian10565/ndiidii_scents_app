import { readFileSync } from 'fs';

// Check env
const envKeys = Object.keys(process.env).filter(k => k.includes('GOOGLE') || k.includes('SHEET') || k.includes('ENV'));
console.log('Env keys (filtered):', envKeys.join(', ').slice(0, 200));
console.log('SERVICE_ACCOUNT_EMAIL set:', !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
console.log('PRIVATE_KEY set:', !!process.env.GOOGLE_PRIVATE_KEY);

// Load next-batch to verify
const batchPath = '/c/Users/Cicada/Desktop/code/Ndiidii_proj/ndiidii_scents_app/ndiidii-next/data/next-batch.json';
const batch = JSON.parse(readFileSync(batchPath, 'utf8'));
console.log('\nNext 10 entries:');
batch.forEach((r, i) => {
  console.log(`${i}: ${r.brand} | ${r.name} | id=${r.id}`);
});
