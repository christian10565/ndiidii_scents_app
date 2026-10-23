import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
config();

const DATA = join(process.cwd(), 'data');
const mm = JSON.parse(readFileSync(join(DATA, 'match-map.json'), 'utf8'));
const um = JSON.parse(readFileSync(join(DATA, 'upload-map.json'), 'utf8'));
const snap = JSON.parse(readFileSync(join(DATA, 'catalog-snapshot.json'), 'utf8'));

// 1. match-map confidence breakdown
const conf = mm.filter(x => x.matched && x.matched.score >= 0.85);
const rev = mm.filter(x => x.matched && x.matched.score >= 0.6 && x.matched.score < 0.85);
const unm = mm.filter(x => !x.matched || x.matched.score < 0.6 || !x.matched.imageUrl);
console.log('match-map: total', mm.length, '| confident>=0.85:', conf.length, '| review 0.6-0.85:', rev.length, '| unmatched:', unm.length);

// 2. upload-map cloudinaryUrl breakdown
const withCloud = um.filter(x => x.cloudinaryUrl);
console.log('upload-map: total', um.length, '| with cloudinaryUrl:', withCloud.length);
if (withCloud.length) {
  console.log('  sample:', JSON.stringify(withCloud[0]));
}

// 3. Does the sheet snapshot's perfumes have imageUrl populated?
const pWithImg = snap.perfumes.filter(p => p.imageUrl).length;
const pNoImg = snap.perfumes.filter(p => !p.imageUrl).length;
console.log('catalog-snapshot.perfumes: with imageUrl:', pWithImg, '| no imageUrl:', pNoImg);

// 4. Cross-check: among the cloudinaryUrls, how many are confident matches?
const confSet = new Set(conf.map(x => `${x.sheetBrand}||${x.sheetName}`));
const cloudConfident = withCloud.filter(x => confSet.has(`${x.sheetBrand}||${x.sheetName}`));
console.log('cloudinaryUrls that are confident matches:', cloudConfident.length);

// 5. Among confident matches, how many already have an image in the snapshot?
const confWithImg = conf.filter(x => snap.perfumes.find(p => p.sheetId === x.sheetName)?.imageUrl);
console.log('confident matches already having an imageUrl in snapshot:', confWithImg.length);

// 6. Write out a concise status summary file for the user
const summary = {
  googleSheet: {
    sheetId: process.env.GOOGLE_SHEET_ID,
    status: 'READ OK (1099 rows, 1046 usable) via scripts/check-sheets.mts',
  },
  imageColumn: {
    totalUsable: snap.perfumes.length,
    filled: pWithImg,
    missing: pNoImg,
  },
  matching: {
    matchMapFile: 'data/match-map.json',
    confident: conf.length,
    review: rev.length,
    unmatched: unm.length,
  },
  cloudinary: {
    uploadMapFile: 'data/upload-map.json',
    cloudinaryUrlsPopulated: withCloud.length,
    cloudinaryUrlsThatAreConfident: cloudConfident.length,
  },
  pipeline: {
    scripts: ['scripts/write-images.mjs', 'scripts/upload-cloudinary.mjs'],
    writeImagesDryRun: 'rows_to_update=0 | already_filled=633 | no_cloudinary=413',
  },
};
writeFileSync(join(DATA, 'sheet-check-report.json'), JSON.stringify(summary, null, 2));
console.log('\nWrote data/sheet-check-report.json');
console.log(JSON.stringify(summary, null, 2));
