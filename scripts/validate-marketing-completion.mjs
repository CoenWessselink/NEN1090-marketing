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
for (const href of ['/nl/checkout?cycle=monthly', '/nl/checkout?cycle=yearly']) {
  if (!pricing.includes(href)) fail.push(`nl/prijzen.html: missing checkout CTA ${href}`);
}

const contact = read('nl/contact.html');
if (!contact.includes('data-enterprise-form')) fail.push('nl/contact.html: missing working lead form hook');
if (!contact.includes('data-enterprise-status')) fail.push('nl/contact.html: missing visible submit status');
if (!contact.includes('enterprise-flow.js')) fail.push('nl/contact.html: missing form submission script');
if (!contact.includes('privacy.html') || !contact.includes('terms.html')) fail.push('nl/contact.html: missing legal links');

const demo = read('nl/demo.html');
if (!demo.includes('mailto:info@weldinspectpro.com')) fail.push('nl/demo.html: missing direct demo mailto route');
if (!demo.includes('info@weldinspectpro.com')) fail.push('nl/demo.html: missing visible demo contact email');

for (const file of ['contact.html', 'nl/contact.html']) {
  const html = read(file);
  if (!html.includes('mailto:info@weldinspectpro.com')) fail.push(`${file}: missing visible mailto contact route`);
  if (!html.includes('info@weldinspectpro.com')) fail.push(`${file}: missing visible contact email`);
}

for (const file of [
  'index.html',
  'contact.html',
  'pricing.html',
  'demo.html',
  'platform.html',
  'inspections.html',
  'reports.html',
  'security.html',
  'resources.html',
  'standards.html',
  'trial.html',
]) {
  const html = read(file);
  for (const term of [
    'GLOBAL WELDING COMPLIANCE',
    'Enterprise Welding Compliance',
    'Trusted by leading companies',
    'audit-ready',
    'guaranteed compliance',
    'tenant isolation',
    'Azure Blob Storage',
    'AWS D1.1',
    'ASME IX',
    'API 1104',
    'SSO/SAML',
    'Enterprise SLA',
    'API webhooks',
  ]) {
    if (html.toLowerCase().includes(term.toLowerCase())) fail.push(`${file}: unsafe or legacy public claim "${term}"`);
  }
  if (file !== 'pricing.html' && html.includes('Normen')) fail.push(`${file}: mixed Dutch navigation/content on English route`);
}

const forbiddenVisible = [
  'Hoofdkeyword',
  'Secundaire keywords',
  'Secundair:',
  'Interne SEO-silo',
  'SEO cluster',
  'Knowledge workflow overview',
  'practical reader need',
  'Dedicated story and product view',
  'Specific product moments',
  'thin product copy',
  'recycled product cards',
  'No recycled product cards',
  'Different product views:',
  'Digitale werkprocess voor',
  'CE-dossieropbouwen',
  'complianceclaims',
  'audit-ready output',
  'without fake proof',
  'zonder verzonnen bewijs',
  'This is answered with practical context',
  'SEO workflow overview',
  'real search intent',
  'No recycled product cards',
];
for (const file of walk(root)) {
  const html = read(file);
  for (const term of forbiddenVisible) {
    if (html.includes(term)) fail.push(`${file}: visible internal SEO term "${term}"`);
  }
  for (const brand of ['MAMMOET', 'HEEREMA', 'BOSKALIS', 'VAN OORD', 'TATA STEEL', 'TECHNIPFMC']) {
    if (html.includes(brand)) fail.push(`${file}: unsupported customer/trust claim "${brand}"`);
  }
}

for (const file of ['index.html', 'pricing.html', 'demo.html', 'trial.html', 'case-studies.html']) {
  const html = read(file);
  if (!html.includes('Tasche Staalbouw')) fail.push(`${file}: missing Tasche Staalbouw customer reference`);
}

for (const file of ['index.html', 'nl/index.html']) {
  const html = read(file);
  for (const schemaType of ['Organization', 'WebSite', 'SoftwareApplication']) {
    if (!html.includes(`"@type":"${schemaType}"`)) fail.push(`${file}: missing ${schemaType} structured data`);
  }
}

for (const file of ['trial.html', 'demo.html', 'nl/trial.html', 'nl/demo.html']) {
  if (!read(file).includes('"@type":"FAQPage"')) fail.push(`${file}: missing FAQPage structured data`);
}

for (const file of walk(join(root, 'nl'))) {
  const html = read(file);
  for (const broken of ['\u00e2\u20ac\u2122', '\u00c3\u00ab', '\u00c3\u00a9', '\u00c3\u00af', '\u00c3\u00b3', '\u00c2\u00b7', 'foto?s']) {
    if (html.includes(broken)) fail.push(`${file}: broken Dutch encoding sequence "${broken}"`);
  }
}

const canonicalPages = new Map();
for (const file of walk(root)) {
  const html = read(file);
  const canonical = html.match(/<link rel="canonical" href="(https:\/\/weldinspectpro\.com[^"]+)">/)?.[1];
  if (canonical && !canonicalPages.has(canonical)) canonicalPages.set(canonical, { file, html });
}
const titles = new Map();
const descriptions = new Map();
for (const [canonical, { file, html }] of canonicalPages) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta name="description" content="([^"]*)">/i)?.[1]?.trim();
  if (!title) fail.push(`${file}: missing title`);
  else if (titles.has(title)) fail.push(`${file}: duplicate title with ${titles.get(title)} (${title})`);
  else titles.set(title, canonical);
  if (!description) fail.push(`${file}: missing meta description`);
  else if (descriptions.has(description)) fail.push(`${file}: duplicate meta description with ${descriptions.get(description)}`);
  else descriptions.set(description, canonical);
}

for (const directory of ['resources', 'nl/blog']) {
  for (const entry of readdirSync(join(root, directory))) {
    if (!entry.endsWith('.html') || entry === 'index.html') continue;
    const file = `${directory}/${entry}`;
    const html = read(file);
    const visible = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = visible.split(' ').filter(Boolean).length;
    if (words < 600) fail.push(`${file}: article contains ${words} words, expected at least 600`);
    if (!html.includes('"@type":"Article"')) fail.push(`${file}: missing Article structured data`);
  }
}

const requiredNlLinks = ['/nl/en-1090-software', '/nl/lasinspectie-software', '/nl/ce-dossier-software'];
for (const file of walk(join(root, 'nl'))) {
  const html = read(file);
  for (const link of requiredNlLinks) {
    const legacy = `${link}.html`;
    if (!html.includes(link) && !html.includes(legacy)) fail.push(`${file}: missing required internal link ${link}`);
  }
}

if (fail.length) {
  console.error(`Marketing completion validation failed:\n${fail.join('\n')}`);
  process.exit(1);
}

console.log('Marketing completion validation passed.');
