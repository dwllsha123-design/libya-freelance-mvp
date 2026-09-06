import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(__dirname, 'gen-logo.png');
const brandDir = path.join(root, 'public/brand');
fs.mkdirSync(brandDir, { recursive: true });

if (!fs.existsSync(src)) {
  throw new Error(`Missing ${src}`);
}

async function removeSolidBackground(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // White plate
    if (r >= 245 && g >= 245 && b >= 245) {
      data[i + 3] = 0;
      continue;
    }
    // Black plate (in case source is black)
    if (r <= 28 && g <= 28 && b <= 28) {
      data[i + 3] = 0;
      continue;
    }
    // Soft edge against white
    if (r >= 220 && g >= 220 && b >= 220) {
      const whiteness = (r + g + b) / 3;
      data[i + 3] = Math.min(
        255,
        Math.max(0, Math.round(((255 - whiteness) / 35) * 255)),
      );
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
}

const transparent = await removeSolidBackground(src);
const trimmed = await transparent.trim({ threshold: 8 }).png().toBuffer();
const meta = await sharp(trimmed).metadata();
const maxSide = Math.max(meta.width, meta.height);
const pad = Math.round(maxSide * 0.12);
const canvas = maxSide + pad * 2;
const left = Math.round((canvas - meta.width) / 2);
const top = Math.round((canvas - meta.height) / 2);

const master = await sharp({
  create: {
    width: canvas,
    height: canvas,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([{ input: trimmed, left, top }])
  .png()
  .toBuffer();

const masterPath = path.join(brandDir, 'logo-transparent.png');
await sharp(master)
  .resize(1024, 1024, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(masterPath);

const outs = [
  ['public/favicon-16x16.png', 16],
  ['public/favicon-32x32.png', 32],
  ['public/apple-touch-icon.png', 180],
  ['public/logo-icon.png', 512],
  ['public/logo.png', 512],
  ['src/app/icon.png', 512],
  ['src/app/apple-icon.png', 180],
  ['src/assets/brand/logo-icon.png', 512],
  ['public/brand/logo-mark.png', 512],
];

for (const [rel, size] of outs) {
  const out = path.join(root, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(master)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(out);
  console.log('wrote', rel);
}

const check = await sharp(masterPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
let transparentPixels = 0;
for (let i = 3; i < check.data.length; i += 4) {
  if (check.data[i] === 0) transparentPixels += 1;
}
console.log(
  'transparent ratio',
  (transparentPixels / (check.info.width * check.info.height)).toFixed(3),
);

// favicon.ico
const pngToIco = (await import('png-to-ico')).default;
const ico = await pngToIco([
  path.join(root, 'public/favicon-16x16.png'),
  path.join(root, 'public/favicon-32x32.png'),
]);
fs.writeFileSync(path.join(root, 'public/favicon.ico'), ico);
fs.writeFileSync(path.join(root, 'src/app/[locale]/favicon.ico'), ico);
console.log('wrote favicon.ico');
