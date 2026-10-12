// Verifies the live Google Sheet connection: reads both tabs and reports row
// counts plus the first mapped product. Run from the project root:
//   npx tsx scripts/check-sheets.mts
import { config } from 'dotenv';
import { readTab } from '../src/lib/sheets';
import { mapPerfumeRow, mapOilRow } from '../src/lib/mappers';

config();

async function check(label: string, tab: string, mapper: (r: any, i: number) => any) {
  try {
    const rows = await readTab(tab);
    const mapped = rows.map((r, i) => mapper(r, i)).filter(Boolean);
    console.log(`✓ ${label} ("${tab}"): ${rows.length} rows, ${mapped.length} usable`);
    if (mapped.length) {
      const s = mapped[0];
      console.log(`   first: "${s.name}"${s.brand ? ` — ${s.brand}` : ''}${s.tier ? ` · Tier ${s.tier}` : ''} · stock=${s.sheetStock ?? 'null'}`);
    }
    return mapped.length;
  } catch (e: any) {
    console.log(`✗ ${label} ("${tab}"): ${e.message}`);
    if (/permission|forbidden|403/i.test(e.message)) {
      console.log('   → Share the sheet with the service-account email (Viewer), then retry.');
    }
    return 0;
  }
}

const perfumeTab = process.env.PERFUME_TAB ?? 'Perfumes';
const oilTab = process.env.OIL_TAB ?? 'Perfume Oils';
console.log(`sheet id: ${process.env.GOOGLE_SHEET_ID?.slice(0, 12)}…\n`);

const p = await check('Perfumes', perfumeTab, mapPerfumeRow);
const o = await check('Oils', oilTab, mapOilRow);

console.log(`\n${p + o > 0 ? 'CONNECTION OK' : 'NOTHING READ — see errors above'}`);
