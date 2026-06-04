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
