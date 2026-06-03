import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();

const cleanRouteMap = new Map([
  ['index', '/'],
  ['platform', '/platform'],
  ['inspections', '/inspections'],
  ['standards', '/standards'],
  ['reports', '/reports'],
  ['pricing', '/pricing'],
  ['resources', '/resources'],
  ['contact', '/contact'],
  ['trial', '/trial'],
  ['demo', '/demo'],
  ['security', '/security'],
  ['use-cases', '/use-cases'],
  ['case-studies', '/case-studies'],
  ['checkout', '/checkout'],
  ['en-1090', '/en-1090'],
  ['en-1090-1', '/en-1090-1'],
  ['en-1090-2', '/en-1090-2'],
  ['en-1090-3', '/en-1090-3'],
  ['iso-3834', '/iso-3834'],
  ['iso-3834-2', '/iso-3834-2'],
  ['iso-3834-3', '/iso-3834-3'],
  ['iso-3834-4', '/iso-3834-4'],
  ['iso-5817', '/iso-5817'],
  ['iso-15609', '/iso-15609'],
  ['iso-15614-1', '/iso-15614-1'],
  ['iso-9606-1', '/iso-9606-1'],
  ['iso-17635', '/iso-17635'],
  ['iso-17637', '/iso-17637'],
  ['iso-14731', '/iso-14731'],
  ['iso-9712', '/iso-9712'],
  ['en-10204', '/en-10204'],
  ['aws-d1-1', '/aws-d1-1'],
  ['aws-d1-2', '/aws-d1-2'],
  ['aws-d1-6', '/aws-d1-6'],
  ['asme-ix', '/asme-ix'],
  ['api-1104', '/api-1104'],
  ['abs', '/abs'],
  ['lloyds', '/lloyds'],
  ['weld-inspection-software', '/weld-inspection-software'],
  ['welding-compliance', '/welding-compliance'],
  ['welding-standards', '/welding-standards'],
  ['inspection-reporting', '/inspection-reporting'],
  ['legal', '/legal.html'],
  ['terms', '/terms.html'],
  ['privacy', '/privacy.html'],
  ['dpa', '/dpa.html'],
  ['acceptable-use', '/acceptable-use'],
  ['billing-refund-policy', '/billing-refund-policy'],
  ['service-availability', '/service-availability'],
]);

const nlRouteMap = new Map([
  ['index', '/nl/'],
  ['lasinspectie-software', '/nl/lasinspectie-software'],
  ['en-1090-software', '/nl/en-1090-software'],
  ['ce-dossier-software', '/nl/ce-dossier-software'],
  ['prijzen', '/nl/prijzen'],
  ['checkout', '/nl/checkout'],
  ['demo', '/nl/demo'],
  ['trial', '/nl/trial'],
  ['contact', '/nl/contact'],
  ['blog', '/nl/blog/'],
]);

function walk(dir = root) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '.git' || entry === 'node_modules') continue;
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) out.push(...walk(abs));
    else if (entry.endsWith('.html')) out.push(abs.slice(root.length + 1).replaceAll('\\', '/'));
  }
  return out;
}

function normalizeHref(file, href) {
  if (
    !href ||
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('/assets/') ||
    href.startsWith('data:')
  ) return href;

  const [pathPart, hashPart = ''] = href.split('#');
  const hash = hashPart ? `#${hashPart}` : '';
  const isNl = file === 'nl/index.html' || file.startsWith('nl/');
  const trimmed = pathPart.replace(/^\.\//, '').replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/\/+$/, '');

  if (pathPart.startsWith('/')) {
    const absoluteTrimmed = trimmed.slice(1);
    if (absoluteTrimmed.startsWith('nl/')) {
      const key = absoluteTrimmed.slice(3) || 'index';
      return `${nlRouteMap.get(key) || `/${absoluteTrimmed}`}${hash}`;
    }
    return `${cleanRouteMap.get(absoluteTrimmed) || `/${absoluteTrimmed}`}${hash}`;
  }

  if (isNl && nlRouteMap.has(trimmed)) return `${nlRouteMap.get(trimmed)}${hash}`;
  if (cleanRouteMap.has(trimmed)) return `${cleanRouteMap.get(trimmed)}${hash}`;
  return `${isNl ? '/nl/' : '/'}${trimmed}${hash}`;
}

function normalizeLinks(file, html) {
  return html
    .replace(/\s+href="([^"]*)"/g, (match, href) => ` href="${normalizeHref(file, href)}"`)
    .replace(/\s+action="([^"]*)"/g, (match, href) => ` action="${normalizeHref(file, href)}"`);
}

function productShowcase(lang = 'en') {
  const nl = lang === 'nl';
  const copy = {
    eyebrow: nl ? 'Productervaring' : 'Product experience',
    title: nl
      ? 'Duidelijke schermen voor iedere stap van lasdocumentatie.'
      : 'Concrete product views for every weld documentation step.',
    text: nl
      ? 'Geen herhaalde dummykaarten: elk scherm laat een ander werkmoment zien, van lasregister en veldinspectie tot bewijs, CE-dossier en rapportage.'
      : 'No repeated dummy cards: every view shows a different work moment, from weld register and field inspection to evidence, CE dossier and reporting.',
    featured: nl ? 'Van project naar dossier' : 'From project to dossier',
    featuredText: nl ? 'Projectscope, lasstatus, inspecties en dossier-readiness in een flow.' : 'Project scope, weld status, inspections and dossier readiness in one flow.',
  };
  const prefix = nl ? 'nl-' : '';
  const cards = nl
    ? [
        ['product-weld-register.svg', 'Lasregister', 'Lassen, status, WPS/WPQ en bewijs bij elkaar.'],
        ['product-mobile-inspection.svg', 'Mobiele inspectie', 'Veldcontrole met foto, bevinding en open actie.'],
        ['product-evidence-panel.svg', 'Bewijs & documenten', 'Foto’s, certificaten, tekeningen en notities gekoppeld.'],
        ['product-report-preview.svg', 'Rapportage', 'Structuur voor review, overdracht en dossieropbouw.'],
      ]
    : [
        ['product-weld-register.svg', 'Weld register', 'Welds, status, WPS/WPQ and evidence together.'],
        ['product-mobile-inspection.svg', 'Mobile inspection', 'Field capture with photo, finding and open action.'],
        ['product-evidence-panel.svg', 'Evidence & documents', 'Photos, certificates, drawings and notes connected.'],
        ['product-report-preview.svg', 'Reporting', 'Structure for review, handover and dossier preparation.'],
      ];

  return `<!-- completion:start:product-story --><section class="completion-band alt premium-product-showcase" data-completion="product-story"><div class="container"><div class="section-head"><span class="kicker">${copy.eyebrow}</span><h2>${copy.title}</h2><p>${copy.text}</p></div><div class="showcase-grid"><a class="showcase-feature" href="/assets/images/visuals/${prefix}hero-weldinspect-product-composite.svg"><img src="/assets/images/visuals/${prefix}hero-weldinspect-product-composite.svg" alt="${copy.featured}"><span><strong>${copy.featured}</strong><small>${copy.featuredText}</small></span></a><div class="showcase-list">${cards.map(([file, title, text]) => `<a class="showcase-mini" href="/assets/images/visuals/${prefix}${file}"><img src="/assets/images/visuals/${prefix}${file}" alt="${title}"><span><strong>${title}</strong><small>${text}</small></span></a>`).join('')}</div></div></div></section><!-- completion:end:product-story -->`;
}

function replaceCompletionBlock(html, id, block) {
  const pattern = new RegExp(`<!-- completion:start:${id} -->[\\s\\S]*?<!-- completion:end:${id} -->`, 'g');
  if (pattern.test(html)) return html.replace(pattern, block);
  const marker = '<section class="final-cta visual-cta">';
  return html.includes(marker) ? html.replace(marker, `${block}${marker}`) : html.replace('</main>', `${block}</main>`);
}

for (const file of walk()) {
  let html = readFileSync(join(root, file), 'utf8');
  html = normalizeLinks(file, html);
  if (file === 'index.html') html = replaceCompletionBlock(html, 'product-story', productShowcase('en'));
  if (file === 'nl/index.html') html = replaceCompletionBlock(html, 'product-story', productShowcase('nl'));
  writeFileSync(join(root, file), html, 'utf8');
}

const copied = [];
for (const file of walk()) {
  if (file.includes('/index.html')) continue;
  if (file.startsWith('nl/')) {
    const name = file.slice(3, -5);
    const target = join(root, 'nl', name, 'index.html');
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(root, file), target);
    copied.push(`nl/${name}`);
    continue;
  }
  const name = file.slice(0, -5);
  if (name === 'index') continue;
  const target = join(root, name, 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(root, file), target);
  copied.push(name);
}

let redirects = `# Clean URL fallbacks\n`;
for (const [name, route] of cleanRouteMap) {
  if (name === 'index') continue;
  if (route.endsWith('.html')) continue;
  const target = route.endsWith('.html') ? route : route;
  redirects += `/${name}.html ${target} 301\n`;
}
for (const [name, route] of nlRouteMap) {
  if (name === 'index' || name === 'blog') continue;
  redirects += `/nl/${name}.html ${route} 301\n`;
}
redirects += `/prijzen-nl /nl/prijzen 302\n/prijzen /nl/prijzen 302\n/contact-sales /nl/contact 302\n`;
writeFileSync(join(root, '_redirects'), redirects, 'utf8');

console.log(`Normalized links and synced ${copied.length} clean-route pages.`);
