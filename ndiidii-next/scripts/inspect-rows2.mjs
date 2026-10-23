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
const idx = {};
allRows[0].forEach((h, i) => { idx[h.trim()] = i; });

const want = ['Queen of Arabia', 'Le Prestige Bold', 'Le Prestige King', 'Gharam', 'Kismet Magic', 'Island Vanilla Dunes', 'Sceptre Oceana', 'Cascade Blue', 'Aseel', 'Ramad Louban'];
for (let i = 1; i < allRows.length; i++) {
  if (!want.includes(allRows[i][idx['Perfume Name']])) continue;
  console.log('---', allRows[i][idx['Perfume Name']], '---');
  console.log('A:', allRows[i][0] || '(blank)');
  console.log('B:', allRows[i][idx['Brand']]);
  console.log('C:', allRows[i][idx['Inspired By']]);
  console.log('D:', allRows[i][idx['Top Notes']]);
  console.log('E:', allRows[i][idx['Heart notes']]);
  console.log('F:', allRows[i][idx['Base Notes']]);
  console.log('G:', allRows[i][idx['Season']]);
  console.log('H:', allRows[i][idx['Occasion']]);
  console.log('I:', allRows[i][idx['Gender']]);
  console.log('J:', allRows[i][idx['Scent profile']]);
  console.log('K:', allRows[i][idx['Price']]);
  console.log('L:', allRows[i][idx['Image']]);
  console.log('M:', allRows[i][idx['Tier']]);
}
