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
import { google } from 'googleapis';

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
const ONLY_MISSING = has('--no-only-missing') ? false : true;
const REVIEW_FILE = has('--review-file') ? argVal('--review-file', '') : '';
const USE_REVIEW = REVIEW_FILE !== '' && !has('--no-review-file');

// ---- read sheet: which rows already have an image? ----
// With --only-missing we skip rows whose Image column is already filled, so a
// re-run after adding new supplier sources only uploads the genuinely new ones.
let filledNames = new Set();
if (ONLY_MISSING) {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'Perfumes' });
  const rows = res.data.values ?? [];
  const headers = rows[0].map((h) => String(h ?? '').trim());
  const iName = headers.findIndex((h) => /name/i.test(h) && !/oil/i.test(h));
  const iImg = headers.findIndex((h) => /image/i.test(h));
  for (const r of rows.slice(1)) {
    const name = String(r[iName] ?? '').trim();
    if (name && String(r[iImg] ?? '').trim()) filledNames.add(name.toLowerCase());
  }
  console.log(`sheet: ${filledNames.size} rows already have an image — these will be skipped`);
}

// ---- normalise for a stable public_id ----
const slug = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

// ---- load existing upload map if present (merge mode) ----
const uploadMapPath = join(process.cwd(), 'data', 'upload-map.json');
let existing = [];
try {
  existing = JSON.parse(await readFile(uploadMapPath, 'utf8'));
} catch {
  existing = [];
}
const existingByKey = new Map();
for (const row of existing) {
  if (!row.cloudinaryUrl) continue;
  existingByKey.set(`${(row.sheetBrand || '').toLowerCase()}||${(row.sheetName || '').toLowerCase()}`, row);
}

// ---- optionally load pre-approved review candidates ----
let reviewApproved = [];
if (REVIEW_FILE) {
  try {
    reviewApproved = JSON.parse(await readFile(join(process.cwd(), REVIEW_FILE), 'utf8'));
  } catch {
    console.error(`Failed to load review file: ${REVIEW_FILE}`);
    process.exit(1);
  }
}

// ---- load match map ----
const map = JSON.parse(await readFile(join(process.cwd(), 'data', 'match-map.json'), 'utf8'));
let todo;
if (USE_REVIEW && reviewApproved.length) {
  // Use only the pre-approved review entries
  todo = reviewApproved.filter((r) => r.imageUrl).map((r) => {
    const m = map.find((mm) => mm.sheetName === r.name && mm.sheetBrand === r.brand);
    return m || { sheetName: r.name, sheetBrand: r.brand, matched: { imageUrl: r.imageUrl, title: r.title, source: r.source, score: r.score } };
  });
} else {
  todo = map.filter((m) => m.matched && m.matched.score >= MIN_SCORE && m.matched.imageUrl);
}
if (ONLY_MISSING) todo = todo.filter((m) => !filledNames.has(m.sheetName.toLowerCase()));
// skip already-uploaded rows so batches are additive
todo = todo.filter((m) => !existingByKey.has(`${(m.sheetBrand || '').toLowerCase()}||${(m.sheetName || '').toLowerCase()}`));
const targets = LIMIT === Infinity ? todo : todo.slice(0, LIMIT);
console.log(`${USE_REVIEW ? 'review-approved' : 'confident'}: ${todo.length}${ONLY_MISSING ? ' (new only)' : ''}; uploading ${targets.length} this run`);

const out = [...existing];
const outByKey = new Map();
for (const row of out) {
  outByKey.set(`${(row.sheetBrand || '').toLowerCase()}||${(row.sheetName || '').toLowerCase()}`, row);
}
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
    const key = `${(m.sheetBrand || '').toLowerCase()}||${(m.sheetName || '').toLowerCase()}`;
    let target = outByKey.get(key);
    if (!target) {
      target = { ...m };
      out.push(target);
      outByKey.set(key, target);
    } else {
      Object.assign(target, m);
    }
    target.cloudinaryUrl = res.secure_url;
    target.cloudinaryPublicId = res.public_id;
    ok++;
    console.log(`✓ [${i + 1}/${targets.length}] ${m.sheetBrand} — ${m.sheetName}  →  ${res.secure_url}`);
  } catch (e) {
    fail++;
    console.error(`✗ [${i + 1}/${targets.length}] ${m.sheetBrand} — ${m.sheetName}: ${e.message}`);
  }
}

await mkdir(join(process.cwd(), 'data'), { recursive: true });
await writeFile(uploadMapPath, JSON.stringify(out, null, 0));
console.log(`\ndone: ${ok} uploaded, ${fail} failed`);
console.log('wrote data/upload-map.json');
