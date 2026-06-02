import { mkdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';

const sourceDir = 'assets/images/marketing';
const outDir = join(sourceDir, 'optimized');
mkdirSync(outDir, { recursive: true });

const images = [
  'hero-welder-action.jpg',
  'photo-weld-closeup.jpg',
  'photo-inspector-tablet.jpg',
  'inspectors-onsite.jpg',
  'report-preview.jpg',
  'mobile-inspection.jpg',
];

const sizes = [480, 768, 1080, 1360];

for (const file of images) {
  const source = join(sourceDir, file);
  const name = basename(file, extname(file));
  const image = sharp(source, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const maxOriginalWidth = Math.min(metadata.width || 1360, 1360);

  await image
    .clone()
    .resize({ width: maxOriginalWidth, withoutEnlargement: true })
    .jpeg({ quality: 76, progressive: true, mozjpeg: true })
    .toFile(join(outDir, `${name}.jpg`));

  for (const width of sizes) {
    if (metadata.width && width > metadata.width) continue;
    await image
      .clone()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 72, effort: 5 })
      .toFile(join(outDir, `${name}-${width}.webp`));
    await image
      .clone()
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality: 72, progressive: true, mozjpeg: true })
      .toFile(join(outDir, `${name}-${width}.jpg`));
  }
}

console.log(`Optimized ${images.length} marketing images into ${outDir}`);
