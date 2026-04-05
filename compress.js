const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = '/Users/brandonwan/Desktop/Portfolio';

// Folders to compress (skip node_modules, fonts, etc.)
const INCLUDE_DIRS = [
  'VIDEO ASSETS',
  'UI IMGS',
  'Posters',
  'Experimental',
  'Social Media',
  'NAV',
  'ABOUT',
  'Devices',
];

const EXTS = ['.png', '.jpg', '.jpeg'];

function getAllImages(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllImages(fullPath));
    } else if (EXTS.includes(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}

// Also grab root-level images (pfp.png etc)
let images = [];
for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory() && EXTS.includes(path.extname(entry.name).toLowerCase())) {
    images.push(path.join(ROOT, entry.name));
  }
}
for (const dir of INCLUDE_DIRS) {
  images.push(...getAllImages(path.join(ROOT, dir)));
}

let totalBefore = 0, totalAfter = 0;

async function compress(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const before = fs.statSync(filePath).size;
  totalBefore += before;

  try {
    const img = sharp(filePath);
    const meta = await img.metadata();

    // Max dimension 2400px (keeps retina quality, kills huge files)
    const resized = meta.width > 2400
      ? img.resize({ width: 2400, withoutEnlargement: true })
      : img;

    let buf;
    if (ext === '.jpg' || ext === '.jpeg') {
      buf = await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    } else {
      buf = await resized.png({ compressionLevel: 9, effort: 10 }).toBuffer();
    }

    // Only write if smaller
    if (buf.length < before) {
      fs.writeFileSync(filePath, buf);
      totalAfter += buf.length;
      const saved = Math.round((1 - buf.length / before) * 100);
      console.log(`✓ ${path.relative(ROOT, filePath)} — ${saved}% smaller`);
    } else {
      totalAfter += before;
      console.log(`= ${path.relative(ROOT, filePath)} — already optimal`);
    }
  } catch (e) {
    totalAfter += before;
    console.log(`✗ ${path.relative(ROOT, filePath)} — skipped (${e.message})`);
  }
}

(async () => {
  console.log(`\nCompressing ${images.length} images...\n`);
  for (const img of images) {
    await compress(img);
  }
  const savedMB = ((totalBefore - totalAfter) / 1024 / 1024).toFixed(1);
  const savedPct = Math.round((1 - totalAfter / totalBefore) * 100);
  console.log(`\n✅ Done. Saved ${savedMB}MB (${savedPct}% reduction)`);
  console.log(`   Before: ${(totalBefore/1024/1024).toFixed(1)}MB → After: ${(totalAfter/1024/1024).toFixed(1)}MB`);
})();
