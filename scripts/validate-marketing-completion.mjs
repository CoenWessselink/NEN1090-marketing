import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const fail = [];
const read = (file) => readFileSync(join(root, file), 'utf8');

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '.git' || entry === 'node_modules') continue;
    const absolute = join(dir, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) files.push(...walk(absolute));
    else if (entry.endsWith('.html')) files.push(absolute.slice(root.length + 1));
  }
  return files;
}

for (const route of [
  'nl/index.html',
  'nl/prijzen.html',
  'nl/checkout.html',
  'nl/trial.html',
  'nl/demo.html',
  'nl/contact.html',
  'nl/lasinspectie-software.html',
  'nl/en-1090-software.html',
  'nl/ce-dossier-software.html',
  'nl/blog/index.html',
]) {
  if (!existsSync(join(root, route))) fail.push(`${route}: missing core route file`);
  else {
    const h1Count = (read(route).match(/<h1[\s>]/gi) || []).length;
    if (h1Count !== 1) fail.push(`${route}: expected exactly one H1, found ${h1Count}`);
  }
}

const checkout = read('assets/js/checkout-flow.js');
if (!checkout.includes('new URLSearchParams(location.search)')) fail.push('checkout-flow.js: query parameters are not parsed');
if (!checkout.includes("params.get('cycle')")) fail.push('checkout-flow.js: cycle query parameter is not read');
if (!/requestedCycle\s*===\s*'monthly'/.test(checkout) || !/requestedCycle\s*===\s*'yearly'/.test(checkout)) fail.push('checkout-flow.js: monthly/yearly query guard missing');

const pricing = read('nl/prijzen.html');
for (const href of ['/nl/checkout.html?cycle=monthly', '/nl/checkout.html?cycle=yearly']) {
  if (!pricing.includes(href)) fail.push(`nl/prijzen.html: missing checkout CTA ${href}`);
}

for (const file of ['nl/demo.html', 'nl/contact.html']) {
  const html = read(file);
  if (!html.includes('data-enterprise-form')) fail.push(`${file}: missing working lead form hook`);
  if (!html.includes('data-enterprise-status')) fail.push(`${file}: missing visible submit status`);
  if (!html.includes('enterprise-flow.js')) fail.push(`${file}: missing form submission script`);
  if (!html.includes('privacy.html') || !html.includes('terms.html')) fail.push(`${file}: missing legal links`);
}

const forbiddenVisible = ['Hoofdkeyword', 'Secundaire keywords', 'Secundair:', 'Interne SEO-silo', 'SEO cluster'];
for (const file of walk(root)) {
  const html = read(file);
  for (const term of forbiddenVisible) {
    if (html.includes(term)) fail.push(`${file}: visible internal SEO term "${term}"`);
  }
  for (const brand of ['MAMMOET', 'HEEREMA', 'BOSKALIS', 'VAN OORD', 'TATA STEEL', 'TECHNIPFMC']) {
    if (html.includes(brand)) fail.push(`${file}: unsupported customer/trust claim "${brand}"`);
  }
}

for (const file of walk(join(root, 'nl'))) {
  const html = read(file);
  for (const link of ['/nl/en-1090-software.html', '/nl/lasinspectie-software.html', '/nl/ce-dossier-software.html']) {
    if (!html.includes(link)) fail.push(`${file}: missing required internal link ${link}`);
  }
}

if (fail.length) {
  console.error(`Marketing completion validation failed:\n${fail.join('\n')}`);
  process.exit(1);
}

console.log('Marketing completion validation passed.');
