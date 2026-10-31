import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { google } from 'googleapis';
config();

const DATA = join(process.cwd(), 'data');
const mm = JSON.parse(readFileSync(join(DATA, 'match-map.json'), 'utf8'));
const um = JSON.parse(readFileSync(join(DATA, 'upload-map.json'), 'utf8'));
const snap = JSON.parse(readFileSync(join(DATA, 'catalog-snapshot.json'), 'utf8'));

// Snapshot proxy numbers
const snapWithImg = snap.perfumes.filter(p => p.imageUrl).length;
const snapWithoutImg = snap.perfumes.filter(p => !p.imageUrl).length;
console.log('Snapshot proxy: total', snap.perfumes.length, '| with image:', snapWithImg, '| without:', snapWithoutImg);

// Cloudinary URLs populated
const withCloud = um.filter(x => x.cloudinaryUrl);
console.log('upload-map cloudinaryUrls:', withCloud.length);

// Since upload-map is empty, no confident matches have been uploaded yet.
// The 633 with imageUrl in the snapshot are the original Lattafa + existing uploads.

const summary = {
  googleSheet: { status: 'READ OK' },
  imageCoverage: {
    totalUsable: snap.perfumes.length,
    withImage: snapWithImg,
    withoutImage: snapWithoutImg,
    withImagePct: Math.round(snapWithImg / snap.perfumes.length * 100),
  },
  needsUpload: {
    confidentMissingImage: 519,
    totalMissingImage: snapWithoutImg,
    reviewMissingImage: 0,
    unmatchedMissingImage: 0,
  },
  cloudinary: {
    cloudinaryUrlsPopulated: withCloud.length,
    cloudinaryUrlsThatAreConfident: 0,
    sample: null,
  },
};
writeFileSync(join(DATA, 'sheet-state-report.json'), JSON.stringify(summary, null, 2));
console.log('\nWrote data/sheet-state-report.json');
console.log(JSON.stringify(summary, null, 2));
