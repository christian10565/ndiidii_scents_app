import { google } from 'googleapis';
import { config } from 'dotenv';
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
console.log('total rows (incl header):', allRows.length);

const idx = {};
allRows[0].forEach((h, i) => { idx[h.trim()] = i; });

// Look for the swapped rows by checking known names
const want = ['Kismet Magic', 'Island Vanilla Dunes'];
for (let i = 1; i < allRows.length; i++) {
  const name = allRows[i][idx['Perfume Name']] || '';
  if (want.some(w => name.includes(w))) {
    console.log('---', name, '---');
    console.log('G (Season):', JSON.stringify(allRows[i][idx['Season']]));
    console.log('H (Occasion):', JSON.stringify(allRows[i][idx['Occasion']]));
    console.log('A:', JSON.stringify(allRows[i][0] || '(blank)'));
    console.log('B:', allRows[i][idx['Brand']]);
    console.log('C:', allRows[i][idx['Inspired By']]);
    console.log('D:', allRows[i][idx['Top Notes']]);
    console.log('E:', allRows[i][idx['Heart notes']]);
    console.log('F:', allRows[i][idx['Base Notes']]);
    console.log('I:', allRows[i][idx['Gender']]);
    console.log('J:', allRows[i][idx['Scent profile']]);
    console.log('K:', allRows[i][idx['Price']]);
    console.log('L:', allRows[i][idx['Image']]);
    console.log('M:', allRows[i][idx['Tier']]);
  }
}
