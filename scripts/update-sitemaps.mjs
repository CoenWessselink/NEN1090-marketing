import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const today = '2026-06-03';
const host = 'https://weldinspectpro.com';

function walk(dir = root) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '.git' || entry === 'node_modules') continue;
    const absolute = join(dir, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) files.push(...walk(absolute));
    else if (entry.endsWith('.html')) files.push(absolute);
  }
  return files;
}

const legalPaths = new Set([
  '/legal',
  '/terms',
  '/privacy',
  '/dpa',
  '/acceptable-use',
  '/billing-refund-policy',
  '/service-availability'
]);

function priority(pathname) {
  if (pathname === '/' || pathname === '/nl/') return '1.0';
  if (['/platform','/inspections','/standards','/reports','/pricing','/trial','/demo','/contact','/nl/lasinspectie-software','/nl/en-1090-software','/nl/ce-dossier-software','/nl/prijzen','/nl/trial','/nl/demo','/nl/contact'].includes(pathname)) return '0.9';
  if (pathname.includes('/blog') || pathname.includes('/gidsen') || pathname === '/resources' || pathname === '/case-studies' || pathname === '/use-cases') return '0.7';
  if (legalPaths.has(pathname)) return '0.5';
  return '0.6';
}

function changefreq(pathname) {
  if (legalPaths.has(pathname) || pathname.includes('privacy') || pathname.includes('terms')) return 'monthly';
  if (pathname.includes('/blog') || pathname.includes('/gidsen')) return 'weekly';
  if (['/pricing','/trial','/demo','/contact','/nl/prijzen','/nl/trial','/nl/demo','/nl/contact'].includes(pathname)) return 'monthly';
  return 'weekly';
}

function entry(loc) {
  const pathname = new URL(loc).pathname;
  return `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>${changefreq(pathname)}</changefreq><priority>${priority(pathname)}</priority></url>`;
}

const urls = new Map();
for (const file of walk()) {
  const html = readFileSync(file, 'utf8');
  const match = html.match(/<link rel="canonical" href="(https:\/\/weldinspectpro\.com[^"]+)">/);
  if (!match) continue;
  const url = match[1].replace(/\.html$/, '');
  urls.set(url, url);
}

const sorted = [...urls.values()].sort((a, b) => {
  const ap = new URL(a).pathname;
  const bp = new URL(b).pathname;
  if (ap === '/') return -1;
  if (bp === '/') return 1;
  if (ap === '/nl/') return bp === '/' ? 1 : -1;
  if (bp === '/nl/') return ap === '/' ? -1 : 1;
  return ap.localeCompare(bp);
});

const nl = sorted.filter((url) => new URL(url).pathname.startsWith('/nl/'));
const legal = sorted
  .filter((url) => legalPaths.has(new URL(url).pathname))
  .map((url) => `${url}.html`);

function xml(list) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map(entry).join('\n')}\n</urlset>\n`;
}

writeFileSync(join(root, 'sitemap.xml'), xml(sorted), 'utf8');
writeFileSync(join(root, 'sitemap-nl.xml'), xml(nl), 'utf8');
writeFileSync(join(root, 'legal-sitemap.xml'), xml(legal), 'utf8');
writeFileSync(join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${host}/sitemap.xml\nSitemap: ${host}/sitemap-nl.xml\nSitemap: ${host}/legal-sitemap.xml\n`, 'utf8');

console.log(`Updated sitemaps: ${sorted.length} total URLs, ${nl.length} Dutch URLs, ${legal.length} legal URLs.`);
