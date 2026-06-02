import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const bundle = [
  'assets/css/site.css',
  'assets/css/enterprise.css',
  'assets/css/super-premium.css',
  'assets/css/visual-premium.css',
].map((file) => `/* ${file} */\n${readFileSync(file, 'utf8')}`).join('\n\n');

const minifiedBundle = bundle
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{}:;,>+~])\s*/g, '$1')
  .replace(/;}/g, '}')
  .trim();

writeFileSync('assets/css/home-performance.css', minifiedBundle);

const marketingImages = [
  'hero-welder-action.jpg',
  'photo-weld-closeup.jpg',
  'photo-inspector-tablet.jpg',
  'inspectors-onsite.jpg',
  'report-preview.jpg',
  'mobile-inspection.jpg',
];

function walk(dir) {
  let files = [];
  for (const entry of readdirSync(dir)) {
    if (['.git', 'node_modules', 'assets/images/marketing/optimized'].includes(entry)) continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files = files.concat(walk(path));
    else if (/\.(html|css|js|mjs)$/.test(entry)) files.push(path);
  }
  return files;
}

for (const path of walk(root)) {
  let html = readFileSync(path, 'utf8');
  let next = html;
  for (const image of marketingImages) {
    next = next.replaceAll(`/assets/images/marketing/${image}`, `/assets/images/marketing/optimized/${image}`);
    next = next.replaceAll(`assets/images/marketing/${image}`, `assets/images/marketing/optimized/${image}`);
    next = next.replaceAll(`../images/marketing/${image}`, `../images/marketing/optimized/${image}`);
  }
  if (next !== html) writeFileSync(path, next);
}

let index = readFileSync('index.html', 'utf8');
index = index.replace(
  '<link rel="stylesheet" href="/assets/css/site.css"><link rel="stylesheet" href="/assets/css/enterprise.css"><link rel="stylesheet" href="/assets/css/super-premium.css">',
  '<link rel="preload" as="image" href="/assets/images/marketing/optimized/hero-welder-action-768.webp" imagesrcset="/assets/images/marketing/optimized/hero-welder-action-480.webp 480w, /assets/images/marketing/optimized/hero-welder-action-768.webp 768w, /assets/images/marketing/optimized/hero-welder-action-1080.webp 1080w, /assets/images/marketing/optimized/hero-welder-action-1360.webp 1360w" imagesizes="(max-width: 760px) 100vw, 56vw" type="image/webp" fetchpriority="high"><link rel="stylesheet" href="/assets/css/home-performance.css">',
);
index = index.replace(
  '<div class="landing-visual"><img src="/assets/images/marketing/optimized/hero-welder-action.jpg" alt="Welder in a steel workshop">',
  '<div class="landing-visual"><picture><source type="image/webp" srcset="/assets/images/marketing/optimized/hero-welder-action-480.webp 480w, /assets/images/marketing/optimized/hero-welder-action-768.webp 768w, /assets/images/marketing/optimized/hero-welder-action-1080.webp 1080w, /assets/images/marketing/optimized/hero-welder-action-1360.webp 1360w" sizes="(max-width: 760px) 100vw, 56vw"><source type="image/jpeg" srcset="/assets/images/marketing/optimized/hero-welder-action-480.jpg 480w, /assets/images/marketing/optimized/hero-welder-action-768.jpg 768w, /assets/images/marketing/optimized/hero-welder-action-1080.jpg 1080w, /assets/images/marketing/optimized/hero-welder-action-1360.jpg 1360w" sizes="(max-width: 760px) 100vw, 56vw"><img src="/assets/images/marketing/optimized/hero-welder-action-768.jpg" width="768" height="515" alt="Welder in a steel workshop" fetchpriority="high" decoding="async"></picture>',
);
index = index.replaceAll('<img src="/assets/images/marketing/optimized/photo-weld-closeup.jpg" alt="">', '<img src="/assets/images/marketing/optimized/photo-weld-closeup.jpg" width="1360" height="864" alt="" loading="lazy" decoding="async">');
index = index.replaceAll('<img src="/assets/images/marketing/optimized/photo-inspector-tablet.jpg" alt="">', '<img src="/assets/images/marketing/optimized/photo-inspector-tablet.jpg" width="1360" height="907" alt="" loading="lazy" decoding="async">');
index = index.replaceAll('<img src="/assets/images/marketing/optimized/inspectors-onsite.jpg" alt="">', '<img src="/assets/images/marketing/optimized/inspectors-onsite.jpg" width="1360" height="907" alt="" loading="lazy" decoding="async">');
index = index.replaceAll('<img src="/assets/images/marketing/optimized/report-preview.jpg" alt="">', '<img src="/assets/images/marketing/optimized/report-preview.jpg" width="1360" height="907" alt="" loading="lazy" decoding="async">');
index = index.replaceAll('<img src="/assets/images/marketing/optimized/mobile-inspection.jpg" alt="">', '<img src="/assets/images/marketing/optimized/mobile-inspection.jpg" width="1360" height="907" alt="" loading="lazy" decoding="async">');
index = index.replaceAll('<img src="/assets/images/marketing/optimized/inspectors-onsite.jpg" alt="', '<img src="/assets/images/marketing/optimized/inspectors-onsite.jpg" width="1360" height="907" loading="lazy" decoding="async" alt="');
index = index.replaceAll('<img src="/assets/images/marketing/optimized/hero-welder-action.jpg" alt="', '<img src="/assets/images/marketing/optimized/hero-welder-action.jpg" width="1360" height="913" loading="lazy" decoding="async" alt="');
index = index.replaceAll('<img src="/assets/images/marketing/optimized/photo-inspector-tablet.jpg" alt="', '<img src="/assets/images/marketing/optimized/photo-inspector-tablet.jpg" width="1360" height="907" loading="lazy" decoding="async" alt="');
index = index.replaceAll('<img src="/assets/images/marketing/optimized/report-preview.jpg" alt="', '<img src="/assets/images/marketing/optimized/report-preview.jpg" width="1360" height="907" loading="lazy" decoding="async" alt="');
writeFileSync('index.html', index);

console.log('Applied homepage performance optimizations.');
