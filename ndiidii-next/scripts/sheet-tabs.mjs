import { google } from 'googleapis';
import { config } from 'dotenv';
config();

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const g = google.sheets({ version: 'v4', auth });
const id = process.env.GOOGLE_SHEET_ID;

(async () => {
  const meta = await g.spreadsheets.get({ spreadsheetId: id });
  const tabs = (meta.data.sheets || []).map((s) => s.properties?.title).filter(Boolean);
  console.log('TABS:', JSON.stringify(tabs));

  const oilTab = tabs.find((t) => t.toLowerCase().includes('oil'));
  if (oilTab) {
    const range = `'${oilTab.replace(/'/g, "''")}'`;
    const r = await g.spreadsheets.values.get({
      spreadsheetId: id,
      range,
      valueRenderOption: 'FORMATTED_VALUE',
    });
    const v = r.data.values || [];
    console.log('OIL header row:', JSON.stringify(v[0]));
    console.log('OIL rows (excl header):', v.length - 1);
  }

  const perfTab = tabs.find((t) => t.toLowerCase().includes('perfume'));
  if (perfTab) {
    const range = `'${perfTab.replace(/'/g, "''")}'`;
    const r = await g.spreadsheets.values.get({
      spreadsheetId: id,
      range,
      valueRenderOption: 'FORMATTED_VALUE',
    });
    const v = r.data.values || [];
    console.log('PERF header row:', JSON.stringify(v[0]));
    console.log('PERF rows (excl header):', v.length - 1);
  }
})().catch((e) => console.error('ERR', e.message));
