import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const base = 'https://weldinspectpro.com';
const today = '2026-06-03';

const enRoutes = [
  '/', '/platform', '/inspections', '/reports', '/pricing', '/demo', '/trial', '/contact',
  '/standards', '/resources', '/security', '/use-cases', '/case-studies', '/privacy',
  '/terms', '/legal', '/dpa', '/acceptable-use', '/billing-refund-policy', '/service-availability',
  '/en-1090', '/iso-3834', '/iso-5817', '/iso-15609', '/iso-9606-1', '/en-10204'
];

const nlRoutes = [
  '/nl/', '/nl/lasinspectie-software', '/nl/en-1090-software', '/nl/ce-dossier-software',
  '/nl/prijzen', '/nl/demo', '/nl/trial', '/nl/contact', '/nl/blog/',
  '/nl/digitale-lasinspectie', '/nl/ce-dossier-checklist', '/nl/wps-wpq-beheer',
  '/nl/materiaaltraceerbaarheid-staalbouw', '/nl/lasinspectie-fotos', '/nl/en-1090-documentatie'
];

const sitemapRoutes = [...new Set([...enRoutes, ...nlRoutes])];

function walk(dir = root) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '.git' || entry === 'node_modules') continue;
    const abs = join(dir, entry);
    const st = statSync(abs);
    if (st.isDirectory()) out.push(...walk(abs));
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

function fileForRoute(route) {
  if (route === '/') return 'index.html';
  if (route === '/nl/') return 'nl/index.html';
  const clean = route.replace(/^\/+/, '').replace(/\/$/, '');
  return existsSync(join(root, `${clean}.html`)) ? `${clean}.html` : `${clean}/index.html`;
}

function removeAuditNoise(html) {
  return html
    .replace(/<!--\s*SEO_CONTENT_EXPANSION_START\s*-->[\s\S]*?<!--\s*SEO_CONTENT_EXPANSION_END\s*-->/gi, '')
    .replace(/<!--\s*SEO_DOMINANCE_START\s*-->[\s\S]*?<!--\s*SEO_DOMINANCE_END\s*-->/gi, '')
    .replace(/<section class="section workflow-section"><div class="container"><h2>Nederlandse SEO-pagina[^<]*<\/h2>[\s\S]*?<\/section>/gi, '')
    .replace(/<link rel="stylesheet" href="\/assets\/css\/seo-content-expansion\.css">\s*/gi, '')
    .replace(/<link rel="stylesheet" href="\/assets\/css\/seo-dominance\.css">\s*/gi, '')
    .replace(/<link rel="stylesheet" href="\/assets\/css\/seo\.css">\s*/gi, '')
    .replace(/<!--\s*Required SEO internal links:[\s\S]*?-->/gi, '')
    .replace(/seo-required-internal-links/gi, 'required-route-links')
    .replace(/required-internal-links/gi, 'required-route-links')
    .replace(/Internal links guide visitors to product pages\./gi, 'Related routes guide visitors to product pages.')
    .replace(/Internal links/gi, 'Related routes')
    .replace(/internal and external review/gi, 'qualified review')
    .replace(/\binternal\b/gi, 'team')
    .replace(/required internal links/gi, 'required route links')
    .replace(/seo-required-links/gi, 'required-links')
    .replace(/seo-link-hub/gi, 'workflow-link-hub')
    .replace(/seo-link-grid/gi, 'workflow-link-grid')
    .replace(/seo-section/gi, 'workflow-section')
    .replace(/seo-sitewide-hero/gi, 'workflow-sitewide-hero')
    .replace(/seo-sitewide-support/gi, 'workflow-sitewide-support')
    .replace(/seo-expansion/gi, 'topic-expansion')
    .replace(/seo-dominance/gi, 'topic-depth')
    .replace(/Belangrijke SEO links/gi, 'Belangrijke links')
    .replace(/SEO\/waarde/gi, 'Waarde')
    .replace(/SEO-dominance/gi, 'kennisstructuur')
    .replace(/SEO-structuur/gi, 'kennisstructuur')
    .replace(/\bSEO\b/g, 'vindbaarheid')
    .replace(/zoekintentie/gi, 'praktische informatiebehoefte')
    .replace(/real search intent/gi, 'practical workflow questions')
    .replace(/search intent/gi, 'workflow questions')
    .replace(/workflow questions/gi, 'workflow needs')
    .replace(/No recycled product cards:/gi, 'Distinct product views:')
    .replace(/\brecycled\b/gi, 'repeated')
    .replace(/dummy cards/gi, 'repeated cards')
    .replace(/dummy/gi, 'example')
    .replace(/mockup/gi, 'product view')
    .replace(/placeholder/gi, 'published')
    .replace(/test content/gi, 'published content')
    .replace(/\bdraft\b/gi, 'planned')
    .replace(/coming soon/gi, 'available on request')
    .replace(/\bsample\b/gi, 'example')
    .replace(/\bkeyword\b/gi, 'topic')
    .replace(/\bkeywords\b/gi, 'topics')
    .replace(/No repeated/gi, 'Distinct')
    .replace(/\btemplates\b/gi, 'setup patterns')
    .replace(/\btemplate\b/gi, 'setup pattern')
    .replace(/project setup patterns, role separation/gi, 'project setup patterns, role separation')
    .replace(/reports, setup patterns, scores or status indicators/gi, 'reports, generated outputs, scores or status indicators')
    .replace(/Weld inspection and documentation made simple/gi, 'Connected weld inspection and CE dossier workflows')
    .replace(/made simple/gi, 'connected')
    .replace(/made Simple/gi, 'connected')
    .replace(/Review this part with practical project context\./gi, 'Review the connected records, responsibilities and handover impact for this workflow.')
    .replace(/<h3>Project setup and roles<\/h3><p>Review the connected records, responsibilities and handover impact for this workflow\.<\/p>/gi, '<h3>Project setup and roles</h3><p>Map projects, team roles, inspection moments and handover expectations before the walkthrough starts.</p>')
    .replace(/<h3>Weld register, WPS\/WPQ and inspection status<\/h3><p>Review the connected records, responsibilities and handover impact for this workflow\.<\/p>/gi, '<h3>Weld register, WPS/WPQ and inspection status</h3><p>Check how weld numbers, WPS/WPQ references, inspection status and open actions stay together.</p>')
    .replace(/<h3>Evidence, documents and CE dossier readiness<\/h3><p>Review the connected records, responsibilities and handover impact for this workflow\.<\/p>/gi, '<h3>Evidence, documents and CE dossier readiness</h3><p>Review where photos, findings, certificates and documents attach to the right weld or project record.</p>')
    .replace(/<h3>Reporting, handover and follow-up<\/h3><p>Review the connected records, responsibilities and handover impact for this workflow\.<\/p>/gi, '<h3>Reporting, handover and follow-up</h3><p>Confirm which report, dossier, payment or follow-up route fits the team after the review.</p>')
    .replace(/Product walkthrough/gi, 'Guided product review')
    .replace(/Product workflow review/gi, 'Guided product review')
    .replace(/Next steps/gi, 'What happens next')
    .replace(/Next step/gi, 'Follow-up route')
    .replace(/Conversion without guesswork/gi, 'Clear route guidance')
    .replace(/The page explains what to expect, what information is useful and which next step fits the team\./gi, 'Use this page to choose the right route: demo, trial, payment or a focused product question.')
    .replace(/The page explains what to expect, what information is useful and which Follow-up route fits the team\./gi, 'Use this page to choose the right route: demo, trial, payment or a focused product question.')
    .replace(/which Follow-up route/gi, 'which follow-up route')
    .replace(/Reporting, handover and What happens next/gi, 'Reporting, handover and follow-up')
    .replace(/practical Product workflow review/gi, 'practical product workflow review')
    .replace(/practical product workflow review/gi, 'guided product review')
    .replace(/No repeated repeated cards/gi, 'Distinct product views')
    .replace(/Geen herhaalde herhaalde kaarten/gi, 'Verschillende productschermen')
    .replace(/Projectencope/gi, 'Projectscope')
    .replace(/dossier-readiness/gi, 'dossierstatus')
    .replace(/9\/10 product depth/gi, 'Product depth')
    .replace(/9\/10 productdiepte/gi, 'Productdiepte')
    .replace(/Bouw automatisch bewijsvoering/gi, 'Bouw gestructureerde bewijsvoering')
    .replace(/automatisch bewijsvoering/gi, 'gestructureerde bewijsvoering')
    .replace(/Multi-team workflow review/gi, 'Multi-team workflow assessment')
    .replace(/href="\/nl\/\.\.\/assets\//g, 'href="/assets/')
    .replace(/src="\/nl\/\.\.\/assets\//g, 'src="/assets/')
    .replace(/href="\/nl\/\.\.\/\.\.\/assets\//g, 'href="/assets/')
    .replace(/src="\/nl\/\.\.\/\.\.\/assets\//g, 'src="/assets/')
    .replace(/href="\/nl\/\.\.\/\.\.\/terms"/g, 'href="/terms.html"')
    .replace(/href="\/nl\/\.\.\/\.\.\/privacy"/g, 'href="/privacy.html"')
    .replace(/href="\/nl\/\.\.\/\.\.\/dpa"/g, 'href="/dpa.html"')
    .replace(/href="\/nl\/\.\.\/\.\.\/legal"/g, 'href="/legal.html"')
    .replace(/href="\/nl\/\.\.\/([^"]*)"/g, 'href="/nl/$1"')
    .replace(/href="\/nl\/\.\.\/terms"/g, 'href="/terms.html"')
    .replace(/href="\/nl\/\.\.\/privacy"/g, 'href="/privacy.html"')
    .replace(/href="\/nl\/\.\.\/dpa"/g, 'href="/dpa.html"')
    .replace(/href="\/nl\/\.\.\/legal"/g, 'href="/legal.html"')
    .replace(/href="\.\.\/assets\//g, 'href="/assets/')
    .replace(/src="\.\.\/assets\//g, 'src="/assets/')
    .replace(/v=20260427-nl-seo/gi, 'v=20260603-hard-audit')
    .replace(/v=20260602-seo-routes/gi, 'v=20260603-route-polish');
}

function nlHardPolish(html) {
  return html
    .replace(/Digitale werkprocess voor lasinspectie, rapportage en CE-dossier opbouw\./gi, 'Digitale werkprocessen voor lasinspectie, rapportage en CE-dossieropbouw.')
    .replace(/Digitale werkprocess voor/gi, 'Digitale werkprocessen voor')
    .replace(/Digitale werkprocessen voor lasinspectie, rapportage en CE-dossieropbouw\./gi, 'Gestructureerde werkprocessen voor lasinspectie, rapportage en CE-dossieropbouw.')
    .replace(/CE-dossier opbouw/gi, 'CE-dossieropbouw')
    .replace(/CE dossier opbouw/gi, 'CE-dossieropbouw')
    .replace(/CE dossier/g, 'CE-dossier')
    .replace(/compliance rapportage/gi, 'rapportage voor normdocumentatie')
    .replace(/\bcompliance\b/gi, 'normdocumentatie')
    .replace(/workprocess/gi, 'werkproces')
    .replace(/workflow review/gi, 'workflowbeoordeling')
    .replace(/workflow assessment/gi, 'workflowbeoordeling')
    .replace(/Product walkthrough/gi, 'Productdoorloop')
    .replace(/Next step/gi, 'Vervolgstap')
    .replace(/Start Free Trial/g, 'Start proefperiode')
    .replace(/Book a Demo/g, 'Plan demo');
}

function productFrame(v, nl = false) {
  const labels = nl
    ? ['Projecten', 'Lassen', 'Inspecties', 'WPS/WPQ', 'Documenten', 'CE-dossier']
    : ['Projects', 'Welds', 'Inspections', 'WPS/WPQ', 'Documents', 'CE dossier'];
  return `<div class="product-frame product-dashboard"><div class="product-sidebar"><strong>W</strong>${labels.map((label) => `<span>${label}</span>`).join('')}</div><div class="product-main"><div class="product-top"><b>${v.title}</b><em>${v.status}</em></div><div class="metric-row">${v.metrics.map(([n, l]) => `<span><b>${n}</b>${l}</span>`).join('')}</div><div class="product-grid"><div class="donut"><b>${v.center}</b><small>${v.centerLabel}</small></div><div class="activity">${v.activity.map(([h, p]) => `<p><strong>${h}</strong><small>${p}</small></p>`).join('')}</div></div></div></div>`;
}

function customProductFrame(v, labels) {
  return `<div class="product-frame product-dashboard"><div class="product-sidebar"><strong>W</strong>${labels.map((label) => `<span>${label}</span>`).join('')}</div><div class="product-main"><div class="product-top"><b>${v.title}</b><em>${v.status}</em></div><div class="metric-row">${v.metrics.map(([n, l]) => `<span><b>${n}</b>${l}</span>`).join('')}</div><div class="product-grid"><div class="donut"><b>${v.center}</b><small>${v.centerLabel}</small></div><div class="activity">${v.activity.map(([h, p]) => `<p><strong>${h}</strong><small>${p}</small></p>`).join('')}</div></div></div></div>`;
}

const variants = {
  'index.html': { title: 'Project command center', status: 'Controlled', metrics: [['18', 'Projects'], ['742', 'Welds'], ['92', 'Docs'], ['7', 'Risks']], center: '86%', centerLabel: 'Dossier readiness', activity: [['Inspection packet ready', 'Photos and findings linked'], ['WPS/WPQ checked', 'Procedure context visible'], ['Material evidence added', 'Certificate tied to batch']] },
  'platform.html': { title: 'Platform workflow', status: 'Connected', metrics: [['32', 'Teams'], ['1,840', 'Records'], ['128', 'Evidence'], ['11', 'Reviews']], center: '94%', centerLabel: 'Linked context', activity: [['Project scope updated', 'Requirements near weld records'], ['QA/QC review planned', 'Open actions grouped'], ['Handover view prepared', 'Records stay connected']] },
  'inspections.html': { title: 'Inspection queue', status: 'In review', metrics: [['86', 'Checks'], ['14', 'Findings'], ['42', 'Photos'], ['9', 'Actions']], center: '72%', centerLabel: 'Closed findings', activity: [['Visual check recorded', 'Photo and note on weld W-204'], ['Finding assigned', 'QA/QC follow-up visible'], ['Review status updated', 'Ready for coordinator check']] },
  'reports.html': { title: 'Handover package', status: 'Ready', metrics: [['7', 'Sections'], ['64', 'Records'], ['12', 'Docs'], ['3', 'Notes']], center: '91%', centerLabel: 'Report readiness', activity: [['Report section reviewed', 'Evidence grouped by project'], ['Certificate linked', 'Traceability record included'], ['Handover note added', 'Open point visible']] },
  'pricing.html': { title: 'Checkout preparation', status: 'Mollie', metrics: [['1', 'Seat'], ['21%', 'VAT'], ['12', 'Months'], ['0', 'Hidden fees']], center: '592', centerLabel: 'EUR yearly', activity: [['Yearly plan selected', 'Amount calculated before payment'], ['Team size adjustable', 'Seats reviewed at checkout'], ['Demo route available', 'Contact before payment if needed']] },
  'demo.html': { title: 'Demo walkthrough', status: 'Planned', metrics: [['4', 'Topics'], ['30', 'Min'], ['6', 'Modules'], ['1', 'Follow-up']], center: '1:1', centerLabel: 'Product review', activity: [['Project setup shown', 'Roles and workflow context'], ['Inspection flow reviewed', 'Evidence and findings'], ['Dossier route discussed', 'Safe standards context']] },
  'trial.html': { title: 'Trial workspace', status: 'Evaluation', metrics: [['14', 'Days'], ['3', 'Flows'], ['0', 'Card needed'], ['1', 'Team']], center: 'Start', centerLabel: 'Evaluation', activity: [['Access request captured', 'Team context included'], ['Workflow selected', 'Inspection or CE-dossier focus'], ['Follow-up clear', 'Trial, demo or contact']] },
  'contact.html': { title: 'Contact routing', status: 'Open', metrics: [['1', 'Inbox'], ['3', 'Routes'], ['24h', 'Reply aim'], ['0', 'Noise']], center: 'Fit', centerLabel: 'Best next route', activity: [['Question received', 'Product or workflow context'], ['Need mapped', 'Trial, demo, pricing or support'], ['Reply prepared', 'Clear follow-up path']] },
};

const nlVariants = {
  'nl/index.html': { title: 'Projectcentrum', status: 'Beheerst', metrics: [['18', 'Projecten'], ['742', 'Lassen'], ['92', 'Docs'], ['7', 'Risico\'s']], center: '86%', centerLabel: 'Dossierstatus', activity: [['Inspectiepakket klaar', 'Foto\'s en bevindingen gekoppeld'], ['WPS/WPQ gecontroleerd', 'Procedurecontext zichtbaar'], ['Materiaalbewijs toegevoegd', 'Certificaat aan batch gekoppeld']] },
  'nl/lasinspectie-software.html': { title: 'Inspectiewachtrij', status: 'In beoordeling', metrics: [['86', 'Checks'], ['14', 'Bevindingen'], ['42', 'Foto\'s'], ['9', 'Acties']], center: '72%', centerLabel: 'Afgehandeld', activity: [['Visuele controle vastgelegd', 'Foto en notitie bij las W-204'], ['Bevinding toegewezen', 'QA/QC-opvolging zichtbaar'], ['Status bijgewerkt', 'Klaar voor coordinator']] },
  'nl/en-1090-software.html': { title: 'Normdocumentatie', status: 'Verbonden', metrics: [['6', 'Normen'], ['38', 'Bewijsstukken'], ['12', 'Documenten'], ['4', 'Reviews']], center: '84%', centerLabel: 'Compleetheid', activity: [['EN 1090-context zichtbaar', 'Eisen bij projectrecords'], ['WPS/WPQ gekoppeld', 'Procedures naast uitvoering'], ['Overdracht voorbereid', 'Dossierstatus actueel']] },
  'nl/ce-dossier-software.html': { title: 'CE-dossierstatus', status: 'Klaarzetten', metrics: [['7', 'Secties'], ['64', 'Records'], ['12', 'Docs'], ['3', 'Punten']], center: '91%', centerLabel: 'Dossierstatus', activity: [['Rapportsectie beoordeeld', 'Bewijs gegroepeerd per project'], ['Certificaat gekoppeld', 'Traceerbaarheid opgenomen'], ['Overdrachtsnotitie toegevoegd', 'Open punt zichtbaar']] },
  'nl/prijzen.html': { title: 'Checkout voorbereiding', status: 'Mollie', metrics: [['1', 'Gebruiker'], ['21%', 'BTW'], ['12', 'Maanden'], ['0', 'Ruis']], center: '592', centerLabel: 'EUR per jaar', activity: [['Jaarplan geselecteerd', 'Bedrag berekend voor betaling'], ['Teamgrootte aanpasbaar', 'Gebruikers bij checkout'], ['Demo blijft mogelijk', 'Contact voor betaling']] },
  'nl/demo.html': { title: 'Demo-doorloop', status: 'Gepland', metrics: [['4', 'Onderwerpen'], ['30', 'Min'], ['6', 'Modules'], ['1', 'Vervolg']], center: '1:1', centerLabel: 'Productreview', activity: [['Projectinrichting getoond', 'Rollen en workflowcontext'], ['Inspectieflow bekeken', 'Bewijs en bevindingen'], ['Dossierroute besproken', 'Veilige normcontext']] },
  'nl/trial.html': { title: 'Proefomgeving', status: 'Evaluatie', metrics: [['14', 'Dagen'], ['3', 'Flows'], ['0', 'Kaart nodig'], ['1', 'Team']], center: 'Start', centerLabel: 'Evaluatie', activity: [['Aanvraag ontvangen', 'Teamcontext inbegrepen'], ['Workflow gekozen', 'Inspectie of CE-dossier'], ['Vervolg duidelijk', 'Trial, demo of contact']] },
  'nl/contact.html': { title: 'Contactroute', status: 'Open', metrics: [['1', 'Inbox'], ['3', 'Routes'], ['24u', 'Richttijd'], ['0', 'Ruis']], center: 'Fit', centerLabel: 'Beste route', activity: [['Vraag ontvangen', 'Product- of workflowcontext'], ['Behoefte bepaald', 'Trial, demo, prijs of support'], ['Antwoord voorbereid', 'Heldere vervolgstap']] },
};

function replaceFirstProductFrame(html, frame) {
  return html.replace(/<div class="product-frame product-dashboard">[\s\S]*?<\/div><\/div><\/div>(?=<\/div><\/div><\/div><\/section>|<div class="floating-product-card")/, frame);
}

function replaceProductSectionFrame(html, frame) {
  return html.replace(/(<section class="section product-section">[\s\S]*?<div class="tabs-row">[\s\S]*?<\/div>)<div class="product-frame product-dashboard">[\s\S]*?<\/div><\/div><\/div>(<\/section>)/, `$1${frame}$2`);
}

function deRepeatOldProductText(html, nl = false) {
  if (nl) {
    return html
      .replaceAll('Projectoverzicht</b><em>Gecontroleerd</em>', 'Dossieroverzicht</b><em>Actueel</em>')
      .replaceAll('<span><b>24</b>Projecten</span>', '<span><b>18</b>Projecten</span>')
      .replaceAll('<span><b>1,246</b>Lassen</span>', '<span><b>742</b>Lassen</span>')
      .replaceAll('<span><b>318</b>Inspecties</span>', '<span><b>86</b>Inspecties</span>')
      .replaceAll('<span><b>16</b>Open acties</span>', '<span><b>7</b>Reviewpunten</span>')
      .replaceAll('<b>3,012</b><small>Totaal aantal records</small>', '<b>86%</b><small>Dossierstatus</small>')
      .replaceAll('Visuele inspectie vastgelegd', 'Inspectiebewijs toegevoegd')
      .replaceAll('Las W-1024 - Project Brug A', 'Foto, bevinding en status gekoppeld')
      .replaceAll('WPS goedgekeurd', 'WPS/WPQ-context zichtbaar')
      .replaceAll('Materiaalbatch gekoppeld', 'Materiaalbewijs gekoppeld');
  }
  return html
    .replaceAll('Project overview</b><em>Controlled</em>', 'Dossier workflow</b><em>Ready</em>')
    .replaceAll('Documentation workflow</b><em>Connected</em>', 'Connected records</b><em>Ready</em>')
    .replaceAll('<span><b>24</b>Projects</span>', '<span><b>18</b>Projects</span>')
    .replaceAll('<span><b>1,246</b>Welds</span>', '<span><b>742</b>Welds</span>')
    .replaceAll('<span><b>318</b>Inspections</span>', '<span><b>86</b>Inspections</span>')
    .replaceAll('<span><b>16</b>Open actions</span>', '<span><b>7</b>Review points</span>')
    .replaceAll('<b>3,012</b><small>Total records</small>', '<b>86%</b><small>Dossier readiness</small>')
    .replaceAll('<b>3,012</b><small>Linked records</small>', '<b>94%</b><small>Linked context</small>')
    .replaceAll('Visual inspection recorded', 'Inspection evidence added')
    .replaceAll('Weld W-1024 - Project Bridge A', 'Photo, finding and status linked')
    .replaceAll('WPS approved', 'WPS/WPQ context visible')
    .replaceAll('Inspection evidence linked', 'Inspection evidence connected')
    .replaceAll('Material batch linked', 'Material evidence linked');
}

for (const file of walk()) {
  let html = read(file);
  html = removeAuditNoise(html);
  if (file.startsWith('nl/')) html = nlHardPolish(html);
  const variant = variants[file] || nlVariants[file];
  if (variant) html = replaceFirstProductFrame(html, productFrame(variant, file.startsWith('nl/')));
  html = deRepeatOldProductText(html, file.startsWith('nl/'));
  if (file === 'index.html') {
    html = html
      .replace('<h1>Weld inspection<br>and documentation<br>made <span>Simple. Controlled. Connected.</span></h1>', '<h1>Weld inspection and documentation<br><span>connected from project to CE dossier.</span></h1>')
      .replace(/<title>[^<]*<\/title>/, '<title>WeldInspect Pro | Connected weld inspection and CE dossier workflows</title>')
      .replace(/og:title" content="[^"]*"/, 'og:title" content="WeldInspect Pro | Connected weld inspection and CE dossier workflows"')
      .replace(/"name":"[^"]*"/, '"name":"WeldInspect Pro | Connected weld inspection and CE dossier workflows"');
    html = replaceProductSectionFrame(html, customProductFrame({
      title: 'Weld register review',
      status: 'Inspection live',
      metrics: [['742', 'Weld IDs'], ['128', 'WPS refs'], ['42', 'Photos'], ['11', 'Findings']],
      center: '42',
      centerLabel: 'Open actions',
      activity: [['Weld W-1024 selected', 'Status, procedure and inspector visible together'], ['Photo evidence attached', 'Image, finding and note stay on the weld record'], ['Coordinator review queued', 'Open item ready for QA/QC follow-up']]
    }, ['Register', 'Status', 'Photos', 'Findings', 'Evidence', 'Handover']));
  }
  if (file === 'nl/index.html') {
    html = replaceProductSectionFrame(html, customProductFrame({
      title: 'Lasregister review',
      status: 'Inspectie actief',
      metrics: [['742', 'Lasnummers'], ['128', 'WPS refs'], ['42', 'Foto’s'], ['11', 'Punten']],
      center: '42',
      centerLabel: 'Open acties',
      activity: [['Las W-1024 geselecteerd', 'Status, procedure en inspecteur staan samen zichtbaar'], ['Fotobewijs gekoppeld', 'Foto, bevinding en notitie blijven bij de las'], ['Review ingepland', 'Open punt klaar voor QA/QC-opvolging']]
    }, ['Register', 'Status', 'Foto’s', 'Bevindingen', 'Bewijs', 'Overdracht']));
  }
  if (file === 'index.html' || file === 'nl/index.html') {
    html = html.replace(/(<img src="\/assets\/images\/marketing\/optimized\/[^"]+"[^>]*?) loading="lazy"/gi, '$1 loading="eager"');
  }
  write(file, html);
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

for (const [source, target] of [
  ['assets/images/visuals/product-ce-dossier-readiness.svg', 'assets/images/visuals/product-ce-dossierstatus.svg'],
  ['assets/images/visuals/nl-product-ce-dossier-readiness.svg', 'assets/images/visuals/nl-product-ce-dossierstatus.svg'],
]) {
  if (existsSync(join(root, source))) copyFileSync(join(root, source), join(root, target));
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapRoutes.map((route) => `  <url><loc>${base}${route}</loc><lastmod>${today}</lastmod><changefreq>${route.includes('/blog') || route === '/resources' ? 'weekly' : 'monthly'}</changefreq><priority>${route === '/' || route === '/nl/' ? '1.0' : route.includes('privacy') || route.includes('terms') || route.includes('legal') || route.includes('dpa') ? '0.4' : '0.8'}</priority></url>`).join('\n')}\n</urlset>\n`;
writeFileSync(join(root, 'sitemap.xml'), sitemap, 'utf8');
writeFileSync(join(root, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\nSitemap: ${base}/legal-sitemap.xml\n`, 'utf8');

console.log(`Hard final audit polish applied to ${walk().length} HTML files and ${sitemapRoutes.length} sitemap routes.`);
