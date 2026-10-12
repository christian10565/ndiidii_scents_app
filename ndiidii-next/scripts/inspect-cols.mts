import { config } from 'dotenv';
import { readTab } from '../src/lib/sheets';
config();
for (const tab of [process.env.PERFUME_TAB ?? 'Perfumes', process.env.OIL_TAB ?? 'Perfume Oils']) {
  const rows = await readTab(tab);
  const first = rows[0];
  console.log(`\n=== "${tab}" — ${rows.length} rows ===`);
  if (!first) { console.log('(no rows)'); continue; }
  console.log('first column (ID):', JSON.stringify(first.first));
  console.log('columns:');
  for (const [h, v] of Object.entries(first.raw)) {
    console.log(`  - "${h}" = ${JSON.stringify(String(v).slice(0, 40))}`);
  }
}
