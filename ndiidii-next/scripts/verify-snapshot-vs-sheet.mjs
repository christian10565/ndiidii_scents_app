import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
config();

const DATA = join(process.cwd(), 'data');
const SNAP_PATH = join(DATA, 'catalog-snapshot.json');
const snap = JSON.parse(readFileSync(SNAP_PATH, 'utf8'));

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const spreadsheetId = process.env.GOOGLE_SHEET_ID;
if (!email || !key || !spreadsheetId) {
  console.error('Missing Google env vars');
  process.exit(1);
}

const { google } = await import('googleapis');
const auth = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });

const normaliseHeader = (h) => h.toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const parseTier = (v) => {
  const m = v?.match(/[123]/);
  return m ? Number(m[0]) : null;
};
const parseGender = (v) => {
  if (!v) return null;
  const s = v.toLowerCase();
  if (s.includes('unisex')) return 'unisex';
  if (/\b(women|woman|female|feminine|ladies|lady|her)\b/.test(s)) return 'women';
  if (/\b(men|man|male|masculine|gentlemen|him)\b/.test(s)) return 'men';
  return null;
};
const parseOilCategory = (v) => {
  if (!v) return null;
  const s = v.toLowerCase();
  if (s.includes('niche') || s.includes('high')) return 'niche';
  if (s.includes('designer')) return 'designer';
  return null;
};
const parseStock = (v) => {
  if (v == null) return null;
  const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? Math.max(0, n) : null;
};

async function readTab(tabName) {
  const range = `'${tabName.replace(/'/g, "''")}'`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range, valueRenderOption: 'FORMATTED_VALUE' });
  const values = res.data.values ?? [];
  if (values.length < 2) return [];
  const headers = values[0].map((h) => String(h ?? '').trim());
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const line = values[i] ?? [];
    const cells = {};
    const raw = {};
    let anyValue = false;
    headers.forEach((header, col) => {
      const value = String(line[col] ?? '').trim();
      if (value) anyValue = true;
      if (col === 0) return;
      if (!header) return;
      cells[normaliseHeader(header)] = value;
      raw[header] = value;
    });
    if (!anyValue) continue;
    rows.push({ first: String(line[0] ?? '').trim(), cells, raw, rowNumber: i + 1 });
  }
  return rows;
}

const ALIASES = {
  name: ['perfumename', 'perfumeoilname', 'oilname', 'name', 'product', 'productname'],
  brand: ['brand', 'house'],
  gender: ['gender'],
  category: ['category'],
  tier: ['tier'],
  scentProfile: ['scentprofile', 'scentfamily', 'family'],
  inspiredBy: ['inspiredby'],
  topNotes: ['topnotes'],
  heartNotes: ['heartnotes', 'middlenotes'],
  baseNotes: ['basenotes'],
  description: ['description', 'about'],
  season: ['season', 'seasons'],
  stock: ['stock', 'quantity', 'qty', 'inventory', 'available', 'unitsavailable'],
  image: ['image', 'imageurl', 'photo', 'picture', 'imagelink'],
};
const knownHeaders = new Set(Object.values(ALIASES).flat());
const pick = (row, field) => {
  for (const key of ALIASES[field]) {
    const v = row.cells[key];
    if (v) return v;
  }
  return null;
};
const extras = (row) => {
  const out = {};
  for (const [header, value] of Object.entries(row.raw)) {
    const norm = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (value && !knownHeaders.has(norm)) out[header] = value;
  }
  return out;
};

function mapBase(row, index) {
  const name = pick(row, 'name');
  if (!name) return null;
  const brand = pick(row, 'brand');
  return {
    sheetId: row.first || slugify(`${brand ?? ''} ${name}`),
    slugBase: slugify(brand ? `${name} ${brand}` : name),
    sortOrder: index,
    name,
    brand,
    gender: parseGender(pick(row, 'gender')),
    imageUrl: pick(row, 'image'),
    sheetStock: parseStock(pick(row, 'stock')),
    extra: extras(row),
  };
}
function mapPerfumeRow(row, index) {
  const base = mapBase(row, index);
  if (!base) return null;
  return {
    ...base,
    scentProfile: pick(row, 'scentProfile'),
    inspiredBy: pick(row, 'inspiredBy'),
    topNotes: pick(row, 'topNotes'),
    heartNotes: pick(row, 'heartNotes'),
    baseNotes: pick(row, 'baseNotes'),
    season: pick(row, 'season'),
    description: pick(row, 'description'),
    tier: parseTier(pick(row, 'tier')),
  };
}
function mapOilRow(row, index) {
  const base = mapBase(row, index);
  if (!base) return null;
  return { ...base, category: parseOilCategory(pick(row, 'category')) };
}

async function main() {
  const [perfumeRows, oilRows] = await Promise.all([readTab('Perfumes'), readTab('Perfume Oils')]);
  const mappedPerfumes = perfumeRows.map((r, i) => mapPerfumeRow(r, i)).filter(Boolean);
  const mappedOils = oilRows.map((r, i) => mapOilRow(r, i)).filter(Boolean);

  const result = {
    snapshot: {
      savedAt: snap.savedAt,
      perfumes: snap.perfumes.length,
      oils: snap.oils.length,
      perfumeNullImg: snap.perfumes.filter((p) => !p.imageUrl).length,
      oilNullImg: snap.oils.filter((o) => !o.imageUrl).length,
    },
    liveSheet: {
      mappedPerfumes: mappedPerfumes.length,
      mappedOils: mappedOils.length,
      perfumeNullImg: mappedPerfumes.filter((p) => !p.imageUrl).length,
      oilNullImg: mappedOils.filter((o) => !o.imageUrl).length,
      oilCategoryNiches: mappedOils.filter((o) => o.category === 'niche').length,
      oilCategoryDesigners: mappedOils.filter((o) => o.category === 'designer').length,
      oilCategoryNull: mappedOils.filter((o) => o.category === null).length,
      oilWithPerfumeTier: mappedOils.filter((o) => o.tier !== null).length,
    },
    perfumeCountMatch: mappedPerfumes.length === snap.perfumes.length,
    oilCountMatch: mappedOils.length === snap.oils.length,
  };

  writeFileSync(join(DATA, 'snapshot-vs-sheet-report.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('verify-snapshot-vs-sheet failed:', err);
  process.exit(1);
});
