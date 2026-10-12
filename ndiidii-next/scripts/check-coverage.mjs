import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from 'dotenv';
import { google } from 'googleapis';
config();

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
let withImg = 0, without = 0;
for (const r of rows.slice(1)) {
  const name = String(r[iName] ?? '').trim();
  if (!name) continue;
  if (String(r[iImg] ?? '').trim()) withImg++; else without++;
}
console.log(`sheet: ${withImg} already have images, ${without} need one`);
