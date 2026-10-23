import { google } from 'googleapis';
import { config } from 'dotenv';
config();

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: process.env.GOOGLE_SHEET_ID,
  range: `'Perfumes'`,
  valueRenderOption: 'FORMATTED_VALUE',
});
const allRows = res.data.values ?? [];
const idx = {};
allRows[0].forEach((h, i) => { idx[h.trim()] = i; });
for (let i = 1; i < allRows.length; i++) {
  const name = allRows[i][idx['Perfume Name']] ?? '';
  if (name === 'Kismet Magic' || name === 'Island Vanilla Dunes') {
    console.log('=== ' + name + ' (row ' + (i + 1) + ') ===');
    console.log('  Base (F):', JSON.stringify(allRows[i][idx['Base Notes']]));
    console.log('  Season (G):', JSON.stringify(allRows[i][idx['Season']]));
    console.log('  Occasion (H):', JSON.stringify(allRows[i][idx['Occasion']]));
    console.log();
  }
}
