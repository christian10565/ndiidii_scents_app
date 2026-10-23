import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { google } from 'googleapis';
config();

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const TAB = 'Perfumes';
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = process.env.GOOGLE_PRIVATE_KEY;

const auth = new google.auth.JWT({
  email,
  key: key.replace(/\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: `'${TAB.replace(/'/g, "''")}'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const allRows = res.data.values ?? [];
const headers = allRows[0].map(h => String(h ?? '').trim());

const idx = {};
headers.forEach((h, i) => { idx[h] = i; });

const names = ['Queen of Arabia', 'Le Prestige Bold', 'Le Prestige King', 'Gharam', 'Kismet Magic', 'Island Vanilla Dunes', 'Sceptre Oceana', 'Cascade Blue', 'Aseel', 'Ramad Louban'];
const want = new Set(names);

console.log('=== Header row ===');
console.log(headers.join(' | '));
console.log();

for (let i = 1; i < allRows.length; i++) {
  const name = allRows[i][idx['Perfume Name']] ?? '';
  if (!want.has(name)) continue;
  console.log(`[${name}]`);
  console.log(`  D(Top):   [${allRows[i][idx['Top Notes']]}]`);
  console.log(`  E(Heart): [${allRows[i][idx['Heart notes']]}]`);
  console.log(`  F(Base):  [${allRows[i][idx['Base Notes']]}]`);
  console.log(`  G(Season):[${allRows[i][idx['Season']]}]`);
  console.log(`  H(Occasion):[${allRows[i][idx['Occasion']]}]`);
  console.log(`  I(Gender):[${allRows[i][idx['Gender']]}]`);
  console.log(`  J(Scent): [${allRows[i][idx['Scent profile']]}]`);
  console.log('');
}
