import { config } from 'dotenv';
import { readFileSync } from 'fs';

config();
console.log('env count after config():', Object.keys(process.env).length);

const keys = ['GOOGLE_SHEET_ID','PERFUME_TAB','OIL_TAB','GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_PRIVATE_KEY','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET','PAYSTACK_SECRET_KEY','KV_REST_API_TOKEN','KV_REST_API_URL','SYNC_SECRET','DEFAULT_STOCK'];
for (const k of keys) {
  const v = process.env[k];
  if (v === undefined) { console.log(k, ': <MISSING>'); continue; }
  const show = k === 'GOOGLE_PRIVATE_KEY' ? v.slice(0, 12) + '...' + v.slice(-8) : (v.length > 60 ? v.slice(0,60)+'...'+v.slice(-8) : v);
  console.log(k, ':', show);
}

// Also show whether the .env file has CRLF or is one big line
const raw = readFileSync('/c/Users/Cicada/Desktop/code/Ndiidii_proj/ndiidii_scents_app/ndiidii-next/.env', 'utf8');
console.log('file length:', raw.length, 'lines:', raw.split('\n').length);
console.log('has CR:', raw.includes('\r'));
console.log('GOOGLE_PRIVATE_KEY literal backslash-n count:', (raw.match(/\\n/g) || []).length);
