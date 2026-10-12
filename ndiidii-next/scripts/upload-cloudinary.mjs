// Uploads matched Zaoud product images to Cloudinary and records the resulting
// URLs. NOTHING is downloaded locally — Cloudinary fetches each image straight
// from the Zaoud CDN by URL.
//
// Reads  data/match-map.json      (from scripts/match.mjs)
// Writes data/upload-map.json     (match-map + cloudinaryUrl per matched row)
//
// Only CONFIDENT matches (score >= 0.85) are uploaded by default. Review/unmatched
// rows are left alone (they keep the on-site placeholder).
//
// Idempotent: public_id = <brand>-<name> slug, overwrite=true, so re-running
// updates in place instead of creating duplicates.
//
// Usage:
//   node scripts/upload-cloudinary.mjs --limit 5      # test with 5 first
//   node scripts/upload-cloudinary.mjs --min-score 0.7  # include review-tier
//   node scripts/upload-cloudinary.mjs                 # all confident matches
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

config();

const cloud = process.env.CLOUDINARY_CLOUD_NAME;
const key = process.env.CLOUDINARY_API_KEY;
const secret = process.env.CLOUDINARY_API_SECRET;
if (!cloud || !key || !secret) {
  console.error('Missing Cloudinary credentials in .env (CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET)');
  process.exit(1);
}
cloudinary.config({ cloud_name: cloud, api_key: key, api_secret: secret });

// ---- args ----
function argVal(flag, dflt) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const has = (f) => process.argv.includes(f);
const LIMIT = has('--limit') ? Number(argVal('--limit', '5')) : Infinity;
const MIN_SCORE = Number(argVal('--min-score', '0.85'));

// ---- normalise for a stable public_id ----
const slug = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

// ---- load match map ----
const map = JSON.parse(await readFile(join(process.cwd(), 'data', 'match-map.json'), 'utf8'));
const todo = map.filter((m) => m.matched && m.matched.score >= MIN_SCORE && m.matched.imageUrl);
const targets = LIMIT === Infinity ? todo : todo.slice(0, LIMIT);
console.log(`matches >= ${MIN_SCORE}: ${todo.length}; uploading ${targets.length} this run\n`);

const out = map.map((m) => ({ ...m })); // preserve everything, add cloudinaryUrl
let ok = 0;
let fail = 0;

for (let i = 0; i < targets.length; i++) {
  const m = targets[i];
  const publicId = `${slug(m.sheetBrand)}-${slug(m.sheetName)}`;
  try {
    const res = await cloudinary.uploader.upload(m.matched.imageUrl, {
      public_id: publicId,
      folder: 'ndiidii',
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
    });
    // Attach the cloudinary URL back onto the matching entry in `out`.
    const target = out.find((o) => o.sheetName === m.sheetName && o.sheetBrand === m.sheetBrand);
    if (target) {
      target.cloudinaryUrl = res.secure_url;
      target.cloudinaryPublicId = res.public_id;
    }
    ok++;
    console.log(`✓ [${i + 1}/${targets.length}] ${m.sheetBrand} — ${m.sheetName}  →  ${res.secure_url}`);
  } catch (e) {
    fail++;
    console.error(`✗ [${i + 1}/${targets.length}] ${m.sheetBrand} — ${m.sheetName}: ${e.message}`);
  }
}

await mkdir(join(process.cwd(), 'data'), { recursive: true });
await writeFile(join(process.cwd(), 'data', 'upload-map.json'), JSON.stringify(out, null, 0));
console.log(`\ndone: ${ok} uploaded, ${fail} failed`);
console.log('wrote data/upload-map.json (has cloudinaryUrl on matched rows)');
