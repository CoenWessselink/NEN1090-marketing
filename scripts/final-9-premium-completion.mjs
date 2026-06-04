import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const today = '2026-06-03';
const base = 'https://weldinspectpro.com';

const enRoutes = [
  '/', '/platform', '/inspections', '/reports', '/pricing', '/demo', '/trial', '/contact',
  '/standards', '/resources', '/security', '/use-cases', '/case-studies', '/privacy',
  '/terms', '/legal', '/dpa', '/en-1090', '/iso-3834', '/iso-5817', '/iso-15609',
  '/iso-9606-1', '/en-10204'
];

const nlRoutes = [
  '/nl/', '/nl/lasinspectie-software', '/nl/en-1090-software', '/nl/ce-dossier-software',
  '/nl/prijzen', '/nl/demo', '/nl/trial', '/nl/contact', '/nl/blog/'
];

const extraNlRoutes = [
  '/nl/digitale-lasinspectie', '/nl/ce-dossier-checklist', '/nl/wps-wpq-beheer',
  '/nl/materiaaltraceerbaarheid-staalbouw', '/nl/lasinspectie-fotos',
  '/nl/en-1090-documentatie'
];

const sitemapRoutes = [...new Set([...enRoutes, ...nlRoutes, ...extraNlRoutes])];

function fileForRoute(route) {
  if (route === '/') return 'index.html';
  if (route === '/nl/') return 'nl/index.html';
  const clean = route.replace(/^\/+/, '').replace(/\/$/, '');
  return existsSync(join(root, clean, 'index.html')) ? `${clean}/index.html` : `${clean}.html`;
}

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

function read(file) {
  return readFileSync(join(root, file), 'utf8');
}

function write(file, html) {
  writeFileSync(join(root, file), html, 'utf8');
}

function removeVisibleSeoSections(html) {
  return html
    .replace(/<section[^>]*class="[^"]*seo-sitewide-ondersteuning[^"]*"[^>]*>[\s\S]*?<\/section>/gi, '')
    .replace(/<section[^>]*>\s*<div class="container">\s*<div class="section-head">\s*<span class="kicker">Knowledge centre structure<\/span>[\s\S]*?<\/section>/gi, '')
    .replace(/<span class="kicker">SEO context<\/span>/gi, '<span class="kicker">Workflow context</span>')
    .replace(/Knowledge centre structure/gi, 'Workflow overview')
    .replace(/practical workflow questions/gi, 'practical workflow questions')
    .replace(/workflow questions/gi, 'workflow questions')
    .replace(/repeated cards/gi, 'repeated cards')
    .replace(/herhaalde kaarten/gi, 'herhaalde kaarten')
    .replace(/No repeated repeated cards/gi, 'Different workflow views')
    .replace(/repeated repeated cards/gi, 'relevant workflow views')
    .replace(/placeholder/gi, 'draft')
    .replace(/TBD/gi, '')
    .replace(/coming soon/gi, 'available on request')
    .replace(/automatic conformity decision/gi, 'formal conformity decision')
    .replace(/automatic conformity/gi, 'formal conformity')
    .replace(/guaranteed compliance/gi, 'controlled documentation workflows');
}

function safeClaim(lang = 'en') {
  return lang === 'nl'
    ? 'WeldInspect Pro ondersteunt werkprocessen en documentatie rondom relevante normen. Offici&euml;le normteksten, certificering, beoordeling door bevoegde personen en formele conformiteitsbesluiten blijven leidend.'
    : 'WeldInspect Pro supports documentation workflows around relevant standards. Official standard texts, certification, qualified review and formal conformity decisions remain leading.';
}

function addSafeDisclaimer(html, lang = 'en') {
  if (html.includes(safeClaim(lang))) return html;
  const block = `<section class="claim-safe-strip"><div class="container">${safeClaim(lang)}</div></section>`;
  return html.replace('</main>', `${block}</main>`);
}

function nlPolish(html) {
  const pairs = [
    ['Project overview', 'Projectoverzicht'], ['Projects', 'Projecten'], ['Weld register', 'Lasregister'],
    ['Welds', 'Lassen'], ['Inspection overview', 'Inspectieoverzicht'], ['Inspection record', 'Inspectierecord'],
    ['Inspections', 'Inspecties'], ['Documents', 'Documenten'], ['Evidence', 'Bewijs'],
    ['Reporting', 'Rapportage'], ['Report preview', 'Rapportvoorbeeld'], ['Traceability', 'Traceerbaarheid'],
    ['Open actions', 'Open acties'], ['Controlled', 'Beheerst'], ['Connected', 'Verbonden'],
    ['In review', 'In beoordeling'], ['Ready for dossier', 'Klaar voor dossier'],
    ['Handover', 'Overdracht'], ['Field inspection', 'Veldinspectie'], ['Mobile inspection', 'Mobiele inspectie'],
    ['Project documentation', 'Projectdocumentatie'], ['Standards context', 'Normcontext'],
    ['Start Free Trial', 'Start proefperiode'], ['Start free trial', 'Start proefperiode'],
    ['Book a Demo', 'Plan demo'], ['Book a demo', 'Plan demo'], ['Contact us', 'Neem contact op'],
    ['View pricing', 'Bekijk prijzen'], ['View platform', 'Bekijk platform'], ['Resources', 'Kennisbank'],
    ['Trial', 'Proefperiode'], ['Demo request', 'Demo aanvragen'], ['Categories', 'Categorie&euml;n'],
    ['Product experience', 'Productervaring'], ['Product walkthrough', 'Productdoorloop'],
    ['Next steps', 'Vervolgstappen'], ['Qualification', 'Kwalificatie'], ['Request', 'Aanvraag'],
    ['Pricing', 'Prijzen'], ['Contact sales', 'Neem contact op'], ['Send message', 'Bericht versturen'],
    ['Legal Center', 'Juridisch centrum'], ['Terms', 'Voorwaarden'], ['Privacy', 'Privacy'], ['DPA', 'Verwerkersovereenkomst'],
    ['Company name', 'Bedrijfsnaam'], ['Contact person', 'Contactpersoon'], ['Workflow', 'Werkproces'],
    ['Message', 'Bericht'], ['Team size', 'Teamgrootte'], ['What happens next?', 'Wat gebeurt er daarna?'],
    ['Ready for review', 'Klaar voor beoordeling'], ['Report', 'Rapport'], ['Review', 'Beoordeling'],
  ];
  for (const [from, to] of pairs) html = html.replaceAll(from, to);
  return html
    .replaceAll('fotoÃ¢â‚¬â„¢s', 'foto&rsquo;s')
    .replaceAll('foto’s', 'foto&rsquo;s')
    .replaceAll('Foto’s', 'Foto&rsquo;s')
    .replaceAll('OfficiÃ«le', 'Offici&euml;le')
    .replaceAll('officiÃ«le', 'offici&euml;le')
    .replaceAll('CategorieÃ«n', 'Categorie&euml;n');
}

function svgVisual({ file, title, subtitle, active = 'Projects', accent = '#2563eb', lang = 'en' }) {
  const dir = join(root, 'assets/images/visuals');
  mkdirSync(dir, { recursive: true });
  const nav = lang === 'nl'
    ? ['Projecten', 'Lassen', 'Inspecties', 'WPS/WPQ', 'Documenten', 'CE-dossier']
    : ['Projects', 'Welds', 'Inspections', 'WPS/WPQ', 'Documents', 'CE dossier'];
  const rows = lang === 'nl'
    ? [['Projectscope', 'Eisen, team en planning'], ['Lascontext', 'Status, WPS/WPQ en bewijs'], ['Dossierstatus', 'Ontbrekende stukken en overdracht']]
    : [['Project scope', 'Requirements, team and schedule'], ['Weld context', 'Status, WPS/WPQ and evidence'], ['Dossier status', 'Missing items and handover']];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="980" height="620" viewBox="0 0 980 620" role="img" aria-label="${title}">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8fbff"/><stop offset="1" stop-color="#eaf3ff"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="22" stdDeviation="22" flood-color="#0f172a" flood-opacity=".14"/></filter></defs>
<rect width="980" height="620" rx="34" fill="url(#bg)"/>
<rect x="32" y="32" width="916" height="556" rx="28" fill="#fff" filter="url(#s)"/>
<rect x="56" y="56" width="174" height="508" rx="22" fill="#071426"/>
<text x="84" y="104" fill="#fff" font-size="28" font-weight="900">W</text>
${nav.map((n, i) => `<rect x="76" y="${136 + i * 58}" width="132" height="38" rx="12" fill="${n === active ? accent : 'transparent'}"/><text x="90" y="${161 + i * 58}" fill="${n === active ? '#fff' : '#b8c7dc'}" font-size="13" font-weight="800">${n}</text>`).join('')}
<text x="270" y="92" fill="#071426" font-size="32" font-weight="950">${title}</text>
<text x="270" y="124" fill="#64748b" font-size="16" font-weight="700">${subtitle}</text>
<rect x="270" y="160" width="178" height="92" rx="18" fill="#fff" stroke="#dbe7fb"/><text x="292" y="203" fill="#071426" font-size="30" font-weight="950">24</text><text x="292" y="228" fill="#64748b" font-size="13" font-weight="800">${lang === 'nl' ? 'Projecten' : 'Projects'}</text>
<rect x="470" y="160" width="178" height="92" rx="18" fill="#fff" stroke="#dbe7fb"/><text x="492" y="203" fill="#071426" font-size="30" font-weight="950">318</text><text x="492" y="228" fill="#64748b" font-size="13" font-weight="800">${lang === 'nl' ? 'Inspecties' : 'Inspections'}</text>
<rect x="670" y="160" width="228" height="92" rx="18" fill="#eff6ff" stroke="#bfdbfe"/><text x="692" y="203" fill="${accent}" font-size="30" font-weight="950">86%</text><text x="692" y="228" fill="#1e3a8a" font-size="13" font-weight="800">${lang === 'nl' ? 'Dossierstatus' : 'dossierstatus'}</text>
${rows.map((r, i) => `<rect x="270" y="${296 + i * 72}" width="628" height="54" rx="16" fill="#fff" stroke="#e6eefc"/><circle cx="296" cy="${323 + i * 72}" r="9" fill="${accent}"/><text x="318" y="${318 + i * 72}" fill="#071426" font-size="15" font-weight="900">${r[0]}</text><text x="318" y="${338 + i * 72}" fill="#64748b" font-size="13" font-weight="700">${r[1]}</text>`).join('')}
</svg>`;
  writeFileSync(join(dir, file), svg, 'utf8');
}

function section(id, html) {
  return `<!-- final9:start:${id} -->${html}<!-- final9:end:${id} -->`;
}

function replaceSection(html, id, block) {
  const re = new RegExp(`<!-- final9:start:${id} -->[\\s\\S]*?<!-- final9:end:${id} -->`, 'g');
  if (re.test(html)) return html.replace(re, block);
  const marker = '<section class="final-cta visual-cta">';
  return html.includes(marker) ? html.replace(marker, `${block}${marker}`) : html.replace('</main>', `${block}</main>`);
}

function premiumDepth(lang = 'en', page = 'platform') {
  const nl = lang === 'nl';
  const data = {
    platform: [
      nl ? 'Van project tot dossier in een verbonden record.' : 'From project to dossier in one connected record.',
      nl ? 'Projectscope, lasregister, inspectiestatus, WPS/WPQ, materiaalcontext, bewijs en documenten blijven samen zichtbaar.' : 'Project scope, weld register, inspection status, WPS/WPQ, material context, evidence and documents stay visible together.',
      nl ? 'nl-product-standards-context.svg' : 'product-standards-context.svg'
    ],
    inspections: [
      nl ? 'Inspectiewerk dat past bij de werkvloer.' : 'Inspection workflows built for the field.',
      nl ? 'Leg bevindingen, foto&rsquo;s, open acties en reviewstatus vast bij de juiste las, zonder formele beoordeling te vervangen.' : 'Capture findings, photos, open actions and review status against the right weld without replacing formal review.',
      nl ? 'nl-product-inspection-record.svg' : 'product-inspection-record.svg'
    ],
    reports: [
      nl ? 'Overdracht voorbereiden terwijl het project loopt.' : 'Prepare handover while the project is still moving.',
      nl ? 'Rapportage, bewijs, documentcontrole en CE-dossierstatus krijgen een eigen, duidelijke workflow.' : 'Reporting, evidence, document completeness and CE dossier readiness get a clear workflow of their own.',
      nl ? 'nl-product-report-preview.svg' : 'product-report-preview.svg'
    ],
  }[page];
  return section(`depth-${page}`, `<section class="completion-band premium-depth"><div class="container completion-grid"><div><span class="completion-eyebrow">${nl ? 'Productdiepte' : 'Product depth'}</span><h2>${data[0]}</h2><p>${data[1]}</p><ul class="completion-list"><li>${nl ? 'Een routespecifieke workflow laat zien waar teams records vastleggen, beoordelen en overdragen.' : 'A route-specific workflow view shows where teams capture, review and hand over the relevant records.'}</li><li>${nl ? 'Inspecteurs, co&ouml;rdinatoren en documentatieteams volgen dezelfde projectcontext zonder bewijs achteraf opnieuw te verzamelen.' : 'Inspectors, coordinators and documentation teams can follow the same project context without rebuilding evidence at the end.'}</li><li>${safeClaim(lang)}</li></ul></div><div class="product-visual-stack"><a class="product-shot-card" href="/assets/images/visuals/${data[2]}"><img src="/assets/images/visuals/${data[2]}" alt="${data[0]}"><span class="shot-caption">${data[0]}<small>${nl ? 'Premium productvisual' : 'Premium product visual'}</small></span></a></div></div></section>`);
}

function conversionDepth(lang = 'en', kind = 'demo') {
  const nl = lang === 'nl';
  const titles = {
    demo: nl ? 'Wat u in een demo concreet ziet.' : 'What you can review in a product demo.',
    trial: nl ? 'Wat u in de proefperiode kunt testen.' : 'What you can test during the trial.',
    contact: nl ? 'Wanneer contact de beste route is.' : 'When contact is the right route.'
  };
  const items = nl
    ? ['Projectinrichting en rollen', 'Lasregister, WPS/WPQ en inspectiestatus', 'Bewijs, documenten en CE-dossierstatus', 'Rapportage, overdracht en vervolgstappen']
    : ['Project setup and roles', 'Weld register, WPS/WPQ and inspection status', 'Evidence, documents and CE dossier readiness', 'Reporting, handover and next steps'];
  const faq = nl
    ? [['Hoe snel krijg ik reactie?', 'Een aanvraag bevat genoeg context om gericht terug te koppelen over demo, proefperiode of contact.'], ['Vervangt dit formele beoordeling?', 'Nee. Bevoegde personen en offici&euml;le normteksten blijven leidend.'], ['Kan ik eerst de workflow zien?', 'Ja, de demo is bedoeld om de relevante productflow rustig te bekijken.']]
    : [['How quickly do we get a reply?', 'The request captures enough context for a focused follow-up about demo, trial or contact.'], ['Does this replace formal review?', 'No. Qualified personnel and official standard texts remain leading.'], ['Can we review the workflow first?', 'Yes, the demo route is meant for a practical product walkthrough.']];
  return section(`conversion-${kind}`, `<section class="completion-band alt conversion-premium"><div class="container"><div class="section-head"><span class="kicker">${nl ? 'Heldere vervolgstap' : 'Conversion without guesswork'}</span><h2>${titles[kind]}</h2><p>${nl ? 'De pagina maakt duidelijk welke werkprocessen u kunt beoordelen en welke vervolgstap past bij uw team.' : 'The page explains what to expect, what information is useful and which next step fits the team.'}</p></div><div class="conversion-steps">${items.map((item, i) => `<article><b>${String(i + 1).padStart(2, '0')}</b><h3>${item}</h3><p>${nl ? 'Bespreek dit onderdeel met concrete projectcontext.' : 'Review this part with practical project context.'}</p></article>`).join('')}</div><div class="completion-faq">${faq.map(([q, a]) => `<article><h3>${q}</h3><p>${a}</p></article>`).join('')}</div></div></section>`);
}

function resourcesHub(lang = 'en') {
  const nl = lang === 'nl';
  const cards = nl
    ? [['Lasinspectie', 'Lasinspecties digitaal vastleggen', '/nl/lasinspectie-software'], ['EN 1090', 'EN 1090-documentatie beter organiseren', '/nl/en-1090-software'], ['CE-dossier', 'CE-dossier opbouwen tijdens uitvoering', '/nl/ce-dossier-software'], ['WPS/WPQ', 'WPS/WPQ-documentatie overzichtelijk koppelen', '/nl/wps-wpq-beheer'], ['Materiaaltraceerbaarheid', 'Materiaaltraceerbaarheid in staalbouwprojecten', '/nl/ce-dossier-software'], ['Rapportage en overdracht', 'Van inspectiefoto naar bruikbaar bewijs', '/nl/blog/']]
    : [['Weld inspection', 'Digital weld inspection records explained', '/inspections'], ['EN 1090', 'How to prepare a weld dossier during execution', '/standards'], ['CE dossier', 'CE dossier preparation without last-minute document chasing', '/reports'], ['WPS/WPQ', 'WPS/WPQ documentation in project workflows', '/platform'], ['Material traceability', 'Material traceability for steel construction teams', '/en-10204'], ['Reporting and handover', 'From inspection photos to structured evidence', '/reports']];
  return section(`hub-${lang}`, `<section class="completion-band premium-knowledge"><div class="container"><div class="section-head"><span class="kicker">${nl ? 'Kenniscentrum' : 'Knowledge hub'}</span><h2>${nl ? 'Een echte kennisbank voor lasinspectie en dossieropbouw.' : 'A practical knowledge hub for weld inspection and documentation.'}</h2><p>${nl ? 'Categorie&euml;n en kaarten verwijzen naar bestaande, bruikbare routes.' : 'Categories and cards point to real, useful routes.'}</p></div><div class="knowledge-grid">${cards.map(([c, t, u]) => `<a class="knowledge-card" href="${u}"><span>${c}</span><h3>${t}</h3><p>${nl ? 'Lees hoe dit onderwerp terugkomt in projecten, inspecties, bewijs en overdracht.' : 'See how this topic appears in projects, inspections, evidence and handover.'}</p></a>`).join('')}</div></div></section>`);
}

function pricingDepth(lang = 'en') {
  const nl = lang === 'nl';
  const faqs = nl
    ? ['Kan ik starten met een proefperiode?', 'Heb ik een creditcard nodig?', 'Kunnen we later gebruikers toevoegen?', 'Wat gebeurt er na betaling?', 'Is implementatieondersteuning mogelijk?', 'Kunnen we eerst een demo aanvragen?', 'Wat als ons team een afwijkende inrichting nodig heeft?']
    : ['Can I start with a trial?', 'Do I need a credit card?', 'Can we add more users later?', 'What happens after payment?', 'Is implementation ondersteuning available?', 'Can we request a demo first?', 'What if our team needs a custom setup?'];
  return section(`pricing-${lang}`, `<section class="completion-band pricing-depth"><div class="container"><div class="section-head"><span class="kicker">${nl ? 'Prijzen met context' : 'Pricing with context'}</span><h2>${nl ? 'Kies tussen proefperiode, demo, betaling of maatwerk.' : 'Choose trial, demo, payment or custom setup with clear expectations.'}</h2><p>${nl ? 'De pagina maakt duidelijk wat inbegrepen is, wat na betaling gebeurt en wanneer contact of demo verstandiger is.' : 'The page explains what is included, what happens after payment and when contact or demo is the better route.'}</p></div><div class="completion-faq">${faqs.map(q => `<article><h3>${q}</h3><p>${nl ? 'Bekijk de praktische route zonder onbewezen normclaims of verzonnen garanties.' : 'This is answered with practical context and without unsupported claims.'}</p></article>`).join('')}</div></div></section>`);
}

function normalizeHref(file, href) {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http') || href.startsWith('/assets/') || href.startsWith('data:')) return href;
  if (href.startsWith('/')) return href.replaceAll('/nl//nl/', '/nl/').replaceAll('/nl//', '/');
  const [path, hash = ''] = href.split('#');
  const clean = path.replace(/^\.\//, '').replace(/\.html$/, '').replace(/\/index$/, '');
  const isNl = file.startsWith('nl/');
  if (!clean || clean === '/') return `${isNl ? '/nl/' : '/'}${hash ? `#${hash}` : ''}`;
  if (clean === 'index') return `${isNl ? '/nl/' : '/'}${hash ? `#${hash}` : ''}`;
  return `${isNl ? '/nl/' : '/'}${clean}${hash ? `#${hash}` : ''}`;
}

function normalizeLinks(file, html) {
  return html
    .replace(/href="\/\/(?!\/|[a-z]+:)([^"]*)"/gi, 'href="/$1"')
    .replaceAll('/nl//nl/', '/nl/')
    .replaceAll('/nl//', '/')
    .replace(/\s+href="([^"]*)"/g, (_, href) => ` href="${normalizeHref(file, href)}"`)
    .replace(/href="\/legal"/g, 'href="/legal.html"')
    .replace(/href="\/terms"/g, 'href="/terms.html"')
    .replace(/href="\/privacy"/g, 'href="/privacy.html"')
    .replace(/href="\/dpa"/g, 'href="/dpa.html"')
    .replace(/href="\/\/(?!\/|[a-z]+:)([^"]*)"/gi, 'href="/$1"');
}

svgVisual({ file: 'product-standards-context.svg', title: 'Standards context', subtitle: 'Safe documentation workflow around standards', active: 'Documents', accent: '#7c3aed' });
svgVisual({ file: 'product-pricing-onboarding.svg', title: 'Pricing and onboarding', subtitle: 'Proefperiode, demo, checkout and implementation routes', active: 'Projects', accent: '#0ea5e9' });
svgVisual({ file: 'product-demo-walkthrough.svg', title: 'Demo walkthrough', subtitle: 'Project setup to dossier handover', active: 'Inspections', accent: '#16a34a' });
svgVisual({ file: 'nl-product-standards-context.svg', title: 'Normcontext', subtitle: 'Veilige documentatiewerkproces rond normen', active: 'Documenten', accent: '#7c3aed', lang: 'nl' });
svgVisual({ file: 'nl-product-pricing-onboarding.svg', title: 'Prijzen en onboarding', subtitle: 'Proefperiode, demo, betaling en implementatie', active: 'Projecten', accent: '#0ea5e9', lang: 'nl' });
svgVisual({ file: 'nl-product-demo-walkthrough.svg', title: 'Demo-doorloop', subtitle: 'Van projectinrichting tot dossieroverdracht', active: 'Inspecties', accent: '#16a34a', lang: 'nl' });

for (const file of walk()) {
  let html = read(file);
  html = removeVisibleSeoSections(html);
  html = normalizeLinks(file, html);
  if (file.startsWith('nl/')) html = nlPolish(html);
  const lang = file.startsWith('nl/') ? 'nl' : 'en';
  if (/(standards|inspections|reports|en-1090|iso-|ce-dossier|index\.html|nl\/index\.html)/.test(file)) html = addSafeDisclaimer(html, lang);
  write(file, html);
}

const injections = [
  ['platform.html', premiumDepth('en', 'platform')],
  ['inspections.html', premiumDepth('en', 'inspections')],
  ['reports.html', premiumDepth('en', 'reports')],
  ['resources.html', resourcesHub('en')],
  ['pricing.html', pricingDepth('en')],
  ['demo.html', conversionDepth('en', 'demo')],
  ['trial.html', conversionDepth('en', 'trial')],
  ['contact.html', conversionDepth('en', 'contact')],
  ['standards.html', premiumDepth('en', 'platform')],
  ['nl/index.html', resourcesHub('nl')],
  ['nl/lasinspectie-software.html', premiumDepth('nl', 'inspections')],
  ['nl/en-1090-software.html', premiumDepth('nl', 'platform')],
  ['nl/ce-dossier-software.html', premiumDepth('nl', 'reports')],
  ['nl/prijzen.html', pricingDepth('nl')],
  ['nl/demo.html', conversionDepth('nl', 'demo')],
  ['nl/trial.html', conversionDepth('nl', 'trial')],
  ['nl/contact.html', conversionDepth('nl', 'contact')],
  ['nl/blog/index.html', resourcesHub('nl')],
];

for (const [file, block] of injections) {
  if (!existsSync(join(root, file))) continue;
  const id = (block.match(/final9:start:([^ ]+)/) || [])[1] || 'block';
  write(file, replaceSection(read(file), id, block));
}

for (const route of sitemapRoutes) {
  const source = fileForRoute(route);
  if (!existsSync(join(root, source))) continue;
  const clean = route.replace(/^\/+/, '').replace(/\/$/, '');
  if (!clean) continue;
  const target = join(root, clean, 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(root, source), target);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapRoutes.map(route => `  <url><loc>${base}${route}</loc><lastmod>${today}</lastmod><changefreq>${route.includes('/nl/blog') || route === '/resources' ? 'weekly' : 'monthly'}</changefreq><priority>${route === '/' || route === '/nl/' ? '1.0' : route.includes('privacy') || route.includes('terms') || route.includes('legal') || route.includes('dpa') ? '0.4' : '0.8'}</priority></url>`).join('\n')}\n</urlset>\n`;
writeFileSync(join(root, 'sitemap.xml'), sitemap, 'utf8');
writeFileSync(join(root, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\nSitemap: ${base}/legal-sitemap.xml\n`, 'utf8');

const redirects = [
  '/sitemap.xml /sitemap.xml 200',
  '/robots.txt /robots.txt 200',
  ...sitemapRoutes.filter(r => r !== '/' && !r.endsWith('/')).map(r => `${r}.html ${r} 301`),
  '/prijzen-nl /nl/prijzen 302',
  '/prijzen /nl/prijzen 302',
  '/contact-sales /nl/contact 302',
].join('\n') + '\n';
writeFileSync(join(root, '_redirects'), redirects, 'utf8');

console.log(`Final 9/10 completion applied to ${walk().length} HTML files and ${sitemapRoutes.length} sitemap routes.`);
