import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { google } from 'googleapis';
config();

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TAB = process.env.PERFUME_TAB ?? 'Perfumes';
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = process.env.GOOGLE_PRIVATE_KEY;
if (!SHEET_ID || !email || !key) { console.log('missing env'); process.exit(1); }
const auth = new google.auth.JWT({ email, key: key.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
const sheets = google.sheets({ version: 'v4', auth });
const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${TAB.replace(/'/g, "''")}'`, valueRenderOption: 'FORMATTED_VALUE' });
const rows = res.data.values ?? [];
const headers = rows[0].map((h, i) => `${i}:${String(h ?? '').trim()}`);
console.log('header cols:', headers.join(' | '));
console.log('total rows (incl header):', rows.length);
console.log('--- first 3 data rows, cols A,B,C (raw) ---');
for (let r = 1; r < Math.min(4, rows.length); r++) {
  console.log(rows[r].join(' || '));
}
