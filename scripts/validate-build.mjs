import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const required = [
  'index.html',
  'platform.html',
  'inspections.html',
  'reports.html',
  'standards.html',
  'pricing.html',
  'resources.html',
  'trial.html',
  'demo.html',
  'legal.html',
  'terms.html',
  'privacy.html',
  'dpa.html',
  'acceptable-use.html',
  'billing-refund-policy.html',
  'service-availability.html',
  'legal-sitemap.xml',
  'assets/css/site.css',
  'assets/js/site.js',
  'functions/api/[[path]].js',
  '_headers',
  '_redirects',
  'robots.txt',
];

const coreHtmlFiles = [
  'index.html',
  'platform.html',
  'inspections.html',
  'reports.html',
  'standards.html',
  'pricing.html',
  'resources.html',
  'trial.html',
  'demo.html',
  'legal.html',
];

const forbidden = [
  'Connect this form to the production API endpoint',
  'placeholder',
  'Placeholder',
  'app.weldinspectapp.com',
];

const requiredLegalLinks = [
  'legal.html',
  'terms.html',
  'privacy.html',
  'dpa.html',
];

const missing = required.filter((file) => !existsSync(join(root, file)));
const violations = [];
if (missing.length) violations.push(`Missing required files:\n${missing.join('\n')}`);

function listFiles(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
    const absolute = join(dir, entry);
    const relative = normalize(absolute.slice(root.length + 1));
    const stat = statSync(absolute);
    if (stat.isDirectory()) files.push(...listFiles(absolute));
    else files.push(relative);
  }
  return files;
}

const allFiles = listFiles(root);
const htmlFiles = allFiles.filter((file) => extname(file) === '.html' && !file.startsWith('dist/'));
const textFiles = allFiles.filter((file) => ['.html', '.js', '.css', '.xml', '.txt'].includes(extname(file)) || file === '_headers' || file === '_redirects');

for (const file of textFiles) {
  const text = readFileSync(join(root, file), 'utf8');
  for (const needle of forbidden) {
    if (text.includes(needle)) violations.push(`${file}: contains forbidden value "${needle}"`);
  }
}

for (const file of htmlFiles) {
  const text = readFileSync(join(root, file), 'utf8');
  if (!text.includes('assets/css/site.css')) violations.push(`${file}: missing stylesheet`);
  if (!text.includes('assets/js/site.js')) violations.push(`${file}: missing script`);
  if (!/<title>[^<]{8,}<\/title>/i.test(text)) violations.push(`${file}: missing useful <title>`);
  if (!/<meta\s+name="description"\s+content="[^\"]{40,}"/i.test(text)) violations.push(`${file}: missing useful meta description`);
}

for (const file of coreHtmlFiles) {
  if (!existsSync(join(root, file))) continue;
  const text = readFileSync(join(root, file), 'utf8');
  for (const link of requiredLegalLinks) {
    if (!text.includes(link)) violations.push(`${file}: missing required legal link ${link}`);
  }
}

if (existsSync(join(root, 'robots.txt'))) {
  const robots = readFileSync(join(root, 'robots.txt'), 'utf8');
  if (!robots.includes('https://weldinspectpro.com/sitemap.xml')) violations.push('robots.txt: missing primary sitemap');
  if (!robots.includes('https://weldinspectpro.com/legal-sitemap.xml')) violations.push('robots.txt: missing legal sitemap');
}

if (existsSync(join(root, 'legal-sitemap.xml'))) {
  const legalSitemap = readFileSync(join(root, 'legal-sitemap.xml'), 'utf8');
  for (const link of requiredLegalLinks) {
    if (!legalSitemap.includes(`https://weldinspectpro.com/${link}`)) violations.push(`legal-sitemap.xml: missing ${link}`);
  }
}

if (violations.length) {
  console.error(`Validation failed:\n${violations.join('\n')}`);
  process.exit(1);
}

console.log(`Validated ${htmlFiles.length} HTML pages, required production files, core legal links, metadata and forbidden domains.`);
