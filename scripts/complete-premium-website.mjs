import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const root = process.cwd();
const visualDir = join(root, 'assets/images/visuals');
mkdirSync(visualDir, { recursive: true });

function read(file) {
  return readFileSync(join(root, file), 'utf8');
}

function write(file, html) {
  writeFileSync(join(root, file), html, 'utf8');
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

function svg({ title, subtitle, active, rows, metrics = [], phone = false }) {
  const nav = ['Projects', 'Welds', 'Inspections', 'WPS/WPQ', 'Documents', 'CE dossier'];
  const width = phone ? 420 : 920;
  const height = phone ? 760 : 560;
  const sidebar = phone ? '' : `<rect x="24" y="24" width="164" height="512" rx="18" fill="#071426"/>
  <text x="56" y="70" fill="#fff" font-size="24" font-weight="800">W</text>
  ${nav.map((n, i) => `<rect x="42" y="${104 + i * 54}" width="116" height="34" rx="10" fill="${n === active ? '#2563eb' : 'transparent'}"/><text x="54" y="${126 + i * 54}" fill="${n === active ? '#fff' : '#b8c7dc'}" font-size="13" font-weight="700">${n}</text>`).join('')}`;
  const x = phone ? 28 : 224;
  const contentWidth = phone ? 364 : 654;
  const metricCards = metrics.map((m, i) => `<rect x="${x + i * ((contentWidth - 24) / Math.max(metrics.length, 1))}" y="${phone ? 134 : 118}" width="${((contentWidth - 36) / Math.max(metrics.length, 1)).toFixed(0)}" height="76" rx="14" fill="#fff" stroke="#dbe7fb"/><text x="${x + 18 + i * ((contentWidth - 24) / Math.max(metrics.length, 1))}" y="${phone ? 166 : 150}" fill="#071426" font-size="24" font-weight="900">${m[0]}</text><text x="${x + 18 + i * ((contentWidth - 24) / Math.max(metrics.length, 1))}" y="${phone ? 188 : 172}" fill="#64748b" font-size="12" font-weight="700">${m[1]}</text>`).join('');
  const rowY = phone ? 244 : 230;
  const rowCards = rows.map((r, i) => `<rect x="${x}" y="${rowY + i * 62}" width="${contentWidth}" height="48" rx="14" fill="#fff" stroke="#e6eefc"/><circle cx="${x + 24}" cy="${rowY + 24 + i * 62}" r="8" fill="${r[2] || '#22c55e'}"/><text x="${x + 44}" y="${rowY + 20 + i * 62}" fill="#071426" font-size="14" font-weight="800">${r[0]}</text><text x="${x + 44}" y="${rowY + 38 + i * 62}" fill="#64748b" font-size="12">${r[1]}</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8fbff"/><stop offset="1" stop-color="#eaf3ff"/></linearGradient><filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0f172a" flood-opacity=".14"/></filter></defs>
  <rect width="${width}" height="${height}" rx="${phone ? 38 : 28}" fill="url(#bg)"/>
  <rect x="${phone ? 16 : 18}" y="${phone ? 16 : 18}" width="${phone ? 388 : 884}" height="${phone ? 728 : 524}" rx="${phone ? 30 : 24}" fill="#fff" filter="url(#shadow)"/>
  ${sidebar}
  <text x="${x}" y="${phone ? 72 : 60}" fill="#071426" font-size="${phone ? 24 : 28}" font-weight="900">${title}</text>
  <text x="${x}" y="${phone ? 100 : 88}" fill="#64748b" font-size="14" font-weight="700">${subtitle}</text>
  ${metricCards}
  ${rowCards.join('')}
  <rect x="${x}" y="${height - (phone ? 98 : 88)}" width="${contentWidth}" height="${phone ? 54 : 46}" rx="14" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="${x + 20}" y="${height - (phone ? 66 : 60)}" fill="#1d4ed8" font-size="14" font-weight="900">Ready for review</text>
</svg>`;
}

const visuals = {
  'product-project-overview.svg': svg({ title: 'Project overview', subtitle: 'Bridge A - controlled project record', active: 'Projects', metrics: [['24', 'Projects'], ['1,246', 'Welds'], ['318', 'Inspections']], rows: [['Steel Hall package', 'Open actions and dossier status visible'], ['Bridge A', 'Inspection scope and documents linked'], ['Production line', 'Traceability evidence in review']] }),
  'product-weld-register.svg': svg({ title: 'Weld register', subtitle: 'Weld list anchored to evidence', active: 'Welds', metrics: [['1,246', 'Welds'], ['92%', 'Reviewed'], ['16', 'Open actions']], rows: [['W-1024', 'Visual inspection recorded'], ['W-0218', 'WPS/WPQ reference attached'], ['W-0047', 'Material certificate linked'], ['W-0312', 'Photo evidence pending', '#f59e0b']] }),
  'product-inspection-record.svg': svg({ title: 'Inspection record', subtitle: 'Findings, status and photo context', active: 'Inspections', metrics: [['318', 'Inspections'], ['21', 'Findings'], ['8', 'In review']], rows: [['Visual check', 'Recorded against weld W-1024'], ['Finding', 'Open action assigned to QA/QC'], ['Photo evidence', 'Attached from field inspection'], ['Review', 'Qualified review remains leading']] }),
  'product-evidence-panel.svg': svg({ title: 'Evidence panel', subtitle: 'Photos, certificates and notes connected', active: 'Documents', metrics: [['184', 'Files'], ['42', 'Certificates'], ['67', 'Photos']], rows: [['Photo set', 'Weld W-1024 before coating'], ['Certificate', 'Material batch and heat number'], ['Drawing', 'Revision linked to project'], ['Inspection note', 'Visible in dossier context']] }),
  'product-ce-dossier-readiness.svg': svg({ title: 'CE dossier readiness', subtitle: 'Prepare handover while work runs', active: 'CE dossier', metrics: [['86%', 'Ready'], ['12', 'Missing'], ['4', 'Review']], rows: [['EN 1090 documentation', 'Project context collected'], ['Inspection records', 'Evidence linked to welds'], ['Material traceability', 'Certificates connected'], ['Report package', 'Prepared for handover']] }),
  'product-report-preview.svg': svg({ title: 'Report preview', subtitle: 'Structured output for review and handover', active: 'CE dossier', metrics: [['7', 'Sections'], ['64', 'Records'], ['Ready', 'Draft']], rows: [['Project summary', 'Scope, team and status'], ['Inspection overview', 'Findings and review notes'], ['Evidence appendix', 'Photos and documents referenced'], ['Handover package', 'Export-ready documentation set']] }),
  'product-mobile-inspection.svg': svg({ title: 'Mobile inspection', subtitle: 'Field view for weld checks', active: 'Inspections', phone: true, metrics: [['W-1024', 'Active weld'], ['3', 'Photos']], rows: [['Status', 'In review'], ['Photo', 'Evidence attached on site'], ['Finding', 'Open action created'], ['WPS', 'Procedure reference visible']] }),
  'hero-weldinspect-product-composite.svg': svg({ title: 'WeldInspect Pro', subtitle: 'Project to dossier workflow', active: 'Projects', metrics: [['Project', 'Bridge A'], ['Weld', 'W-1024'], ['Dossier', '86% ready']], rows: [['Prepare', 'Project requirements and scope'], ['Register', 'Weld list and traceability'], ['Inspect', 'Findings and evidence'], ['Deliver', 'Report and CE dossier context']] })
};

for (const [file, body] of Object.entries(visuals)) {
  writeFileSync(join(visualDir, file), body, 'utf8');
}

function toDutchSvg(body) {
  const replacements = [
    ['Project overview','Projectoverzicht'], ['Bridge A - controlled project record','Brug A - gecontroleerd projectrecord'],
    ['Projects','Projecten'], ['Welds','Lassen'], ['Inspections','Inspecties'], ['Documents','Documenten'],
    ['CE dossier','CE-dossier'], ['Open actions','Open acties'], ['Reviewed','Beoordeeld'], ['In review','In beoordeling'],
    ['Ready for review','Klaar voor beoordeling'], ['Weld register','Lasregister'], ['Weld list anchored to evidence','Lasregister gekoppeld aan bewijs'],
    ['Welds, status and evidence','Lassen, status en bewijs'], ['Inspection record','Inspectierecord'],
    ['Findings, status and photo context','Bevindingen, status en fotocontext'], ['Evidence panel','Bewijspaneel'],
    ['Photos, certificates and notes connected','Foto&apos;s, certificaten en notities gekoppeld'],
    ['CE dossier readiness','CE-dossierstatus'], ['Prepare handover while work runs','Overdracht voorbereiden tijdens uitvoering'],
    ['Report preview','Rapportage preview'], ['Structured output for review and handover','Gestructureerde output voor beoordeling en overdracht'],
    ['Mobile inspection','Mobiele inspectie'], ['Field view for weld checks','Veldweergave voor lascontroles'],
    ['Project to dossier workflow','Van project tot dossier'], ['Active weld','Actieve las'], ['Photos','Foto&apos;s'],
    ['Status','Status'], ['Photo','Foto'], ['Finding','Bevinding'], ['Procedure reference visible','Procedureverwijzing zichtbaar'],
    ['Material certificate linked','Materiaalcertificaat gekoppeld'], ['Photo evidence pending','Fotobewijs ontbreekt'],
    ['Visual inspection recorded','Visuele inspectie vastgelegd'], ['WPS/WPQ reference attached','WPS/WPQ-verwijzing gekoppeld'],
    ['Material certificate attached','Materiaalcertificaat gekoppeld'], ['Inspection records','Inspectierecords'],
    ['Evidence linked to welds','Bewijs gekoppeld aan lassen'], ['Report package','Rapportagepakket'],
    ['Prepared for handover','Klaar voor overdracht'], ['Project summary','Projectsamenvatting'],
    ['Inspection overview','Inspectieoverzicht'], ['Evidence appendix','Bewijsbijlage'], ['Handover package','Overdrachtspakket'],
    ['Scope, team and status','Scope, team en status'], ['Findings and review notes','Bevindingen en beoordelingsnotities'],
    ['Photos and documents referenced','Foto&apos;s en documenten verwezen'], ['Export-ready documentation set','Documentatieset klaar voor export']
  ];
  for (const [a, b] of replacements) body = body.replaceAll(a, b);
  return body;
}

for (const [file, body] of Object.entries(visuals)) {
  writeFileSync(join(visualDir, `nl-${file}`), toDutchSvg(body), 'utf8');
}

function ensureCss(html) {
  if (html.includes('/assets/css/premium-completion.css')) return html;
  const link = '<link rel="stylesheet" href="/assets/css/premium-completion.css">';
  if (html.includes('/assets/css/home-performance.css')) return html.replace('<link rel="stylesheet" href="/assets/css/home-performance.css">', '<link rel="stylesheet" href="/assets/css/home-performance.css">' + link);
  if (html.includes('/assets/css/super-premium.css')) return html.replace('<link rel="stylesheet" href="/assets/css/super-premium.css">', '<link rel="stylesheet" href="/assets/css/super-premium.css">' + link);
  return html.replace('</head>', `${link}</head>`);
}

function removeBlock(html, id) {
  return html.replace(new RegExp(`<!-- completion:start:${id} -->[\\s\\S]*?<!-- completion:end:${id} -->`, 'g'), '');
}

function beforeFinal(html, id, block) {
  html = removeBlock(html, id);
  const marker = '<section class="final-cta visual-cta">';
  return html.includes(marker) ? html.replace(marker, `${block}${marker}`) : html.replace('</main>', `${block}</main>`);
}

function afterHero(html, id, block) {
  html = removeBlock(html, id);
  const idx = html.indexOf('</section>');
  if (idx === -1) return html;
  return html.slice(0, idx + 10) + block + html.slice(idx + 10);
}

function shot(file, title, text) {
  return `<a class="product-shot-card" href="/assets/images/visuals/${file}"><img src="/assets/images/visuals/${file}" alt="${title}"><span class="shot-caption">${title}<small>${text}</small></span></a>`;
}

function gallery(lang = 'en') {
  const nl = lang === 'nl';
  const items = nl
    ? [['nl-product-project-overview.svg','Projectoverzicht','Projectscope, teams en status'],['nl-product-weld-register.svg','Lasregister','Lassen, status en bewijs'],['nl-product-inspection-record.svg','Inspectierecord','Bevindingen en foto&rsquo;s'],['nl-product-ce-dossier-readiness.svg','CE-dossier','Status en overdracht']]
    : [['product-project-overview.svg','Project overview','Scope, teams and status'],['product-weld-register.svg','Weld register','Welds, status and evidence'],['product-inspection-record.svg','Inspection record','Findings and photos'],['product-ce-dossier-readiness.svg','CE dossier readiness','Readiness and handover']];
  return `<div class="product-visual-gallery">${items.map(([f,t,p]) => shot(f,t,p)).join('')}</div>`;
}

function productStory(lang = 'en') {
  const nl = lang === 'nl';
  return `<!-- completion:start:product-story --><section class="completion-band alt" data-completion="product-story"><div class="container"><div class="section-head"><span class="kicker">${nl ? 'Productbeleving' : 'Product experience'}</span><h2>${nl ? 'Niet alleen tekst: concrete schermen voor dagelijks laswerk.' : 'Not just copy: concrete product views for daily weld documentation work.'}</h2><p>${nl ? 'Elke visual laat een ander deel van de workflow zien: projectoverzicht, lasregister, inspectierecord, bewijs, CE-dossier en rapportage.' : 'Each visual shows a different workflow moment: project overview, weld register, inspection record, evidence, CE dossier and reporting.'}</p></div>${gallery(lang)}</div></section><!-- completion:end:product-story -->`;
}

function platformSection() {
  return `<!-- completion:start:platform-depth --><section class="completion-band" data-completion="platform-depth"><div class="container completion-grid"><div><span class="completion-eyebrow">Connected platform</span><h2>One connected record from project setup to dossier handover.</h2><p>The platform page now explains the whole product, not only individual modules. WeldInspect Pro keeps the project, weld register, inspection status, WPS/WPQ references, material traceability, evidence and documents in one record that project teams can review while work is still moving.</p><ul class="completion-list"><li>Project teams see scope, roles and handover context.</li><li>QA/QC can review inspection status and open actions.</li><li>Documentation teams can prepare dossierstatus earlier.</li></ul></div><div class="product-visual-stack">${shot('hero-weldinspect-product-composite.svg','Project to dossier','Connected workflow')}${shot('product-weld-register.svg','Weld register','Structured weld status')}</div></div></section><!-- completion:end:platform-depth -->`;
}

function inspectionsSection(lang = 'en') {
  const nl = lang === 'nl';
  return `<!-- completion:start:inspection-depth --><section class="completion-band" data-completion="inspection-depth"><div class="container completion-grid reverse"><div class="product-visual-stack">${shot(nl ? 'nl-product-inspection-record.svg' : 'product-inspection-record.svg', nl ? 'Inspectierecord' : 'Inspection record', nl ? 'Bevindingen en foto&rsquo;s' : 'Findings and photo context')}${shot(nl ? 'nl-product-mobile-inspection.svg' : 'product-mobile-inspection.svg', nl ? 'Mobiele veldweergave' : 'Mobile field view', nl ? 'Controle op locatie' : 'On-site inspection capture')}</div><div><span class="completion-eyebrow">${nl ? 'Inspectieworkflow' : 'Inspection workflow'}</span><h2>${nl ? 'Leg controles vast zonder de formele beoordeling te vervangen.' : 'Record inspection work without replacing formal qualified review.'}</h2><p>${nl ? 'Teams kunnen bevindingen, foto&rsquo;s, status en open acties vastleggen bij de juiste las. De software organiseert documentatie; formele acceptatie en conformiteitsbesluiten blijven bij bevoegde personen en geldende procedures.' : 'Teams can record findings, photos, status and open actions against the right weld. The platform helps teams record, organise and review inspection documentation. Formal acceptance and conformity decisions remain the responsibility of qualified personnel and applicable procedures.'}</p><ul class="completion-list"><li>${nl ? 'Inspectiestatus zichtbaar per las en project.' : 'Inspection status visible by weld and project.'}</li><li>${nl ? 'Foto&rsquo;s en bewijsmateriaal blijven in context.' : 'Photos and evidence remain in context.'}</li><li>${nl ? 'Open actions are easier to follow up.'.replace('Open actions are easier to follow up.','Open acties zijn duidelijker opvolgbaar.') : 'Open actions are easier to follow up.'}</li></ul></div></div></section><!-- completion:end:inspection-depth -->`;
}

function reportsSection(lang = 'en') {
  const nl = lang === 'nl';
  return `<!-- completion:start:reports-depth --><section class="completion-band alt" data-completion="reports-depth"><div class="container completion-grid"><div><span class="completion-eyebrow">${nl ? 'Rapportage en overdracht' : 'Reporting and handover'}</span><h2>${nl ? 'Maak overdracht rustiger met dossierstatus tijdens uitvoering.' : 'Make handover calmer with dossier status during execution.'}</h2><p>${nl ? 'Rapportage begint niet pas aan het einde. Projectrecords, inspecties, bewijs, documenten en traceerbaarheid vormen samen een duidelijkere basis voor beoordeling en overdracht. Rapporten vervangen geen formele conformiteitsbesluiten.' : 'Reporting does not need to start at the end. Project records, inspections, evidence, documents and traceability create a clearer basis for review and handover. Reports do not automatically guarantee legal or formal conformity.'}</p><ul class="completion-list"><li>${nl ? 'CE-dossierstatus per project zichtbaar.' : 'CE dossier readiness visible by project.'}</li><li>${nl ? 'Documentchecklists en bewijssets gekoppeld.' : 'Document checklists and evidence sets connected.'}</li><li>${nl ? 'Rapportagevoorbereiding vanuit bestaande records.' : 'Report preparation from existing records.'}</li></ul></div><div class="product-visual-stack">${shot(nl ? 'nl-product-report-preview.svg' : 'product-report-preview.svg', nl ? 'Rapportage preview' : 'Report preview', nl ? 'Structuur voor overdracht' : 'Structured handover output')}${shot(nl ? 'nl-product-ce-dossier-readiness.svg' : 'product-ce-dossier-readiness.svg', nl ? 'CE-dossierstatus' : 'CE dossier readiness', nl ? 'Status en ontbrekende stukken' : 'Status and missing items')}</div></div></section><!-- completion:end:reports-depth -->`;
}

function conversionSection(lang = 'en', type = 'demo') {
  const nl = lang === 'nl';
  const demo = type === 'demo';
  const trial = type === 'trial';
  const title = demo ? (nl ? 'Wat u in de demo kunt doorlopen.' : 'What we can walk through in the demo.') : trial ? (nl ? 'Wat u tijdens de proefperiode kunt testen.' : 'What you can test during the trial.') : (nl ? 'Waarvoor u contact kunt opnemen.' : 'Reasons teams contact WeldInspect Pro.');
  const lead = demo ? (nl ? 'We kunnen samen projectinrichting, lasregister, inspectierecords, WPS/WPQ-context, bewijs, CE-dossierstatus en rapportage bekijken.' : 'We can walk through project setup, weld register, inspection records, WPS/WPQ context, evidence, CE dossier readiness and reporting.') : trial ? (nl ? 'Gebruik de proefperiode om echte werkprocesvragen te toetsen voordat u een betaald traject kiest.' : 'Use the trial to evaluate real workflow questions before choosing a paid route.') : (nl ? 'Gebruik contact voor productvragen, implementatie, norm- en documentatiewerkprocessen, prijzen of ondersteuning.' : 'Use contact for product questions, implementation, standards/documentation workflow, pricing or support.');
  return `<!-- completion:start:conversion-depth --><section class="completion-band alt" data-completion="conversion-depth"><div class="container"><div class="section-head"><span class="kicker">${nl ? 'Vervolgstappen' : 'Next steps'}</span><h2>${title}</h2><p>${lead}</p></div><div class="conversion-steps"><article><b>01</b><h3>${nl ? 'Aanvraag' : 'Request'}</h3><p>${nl ? 'Vertel kort welk project- of inspectieproces u wilt bekijken.' : 'Share the project or inspection workflow you want to review.'}</p></article><article><b>02</b><h3>${nl ? 'Kwalificatie' : 'Qualification'}</h3><p>${nl ? 'We stemmen af welke modules en vragen relevant zijn.' : 'We align the relevant modules and questions.'}</p></article><article><b>03</b><h3>${nl ? 'Productdoorloop' : 'Product walkthrough'}</h3><p>${nl ? 'Bekijk projecten, lassen, inspecties, bewijs en dossiercontext.' : 'Review projects, welds, inspections, evidence and dossier context.'}</p></article><article><b>04</b><h3>${nl ? 'Volgende stap' : 'Next step'}</h3><p>${nl ? 'Kies proefperiode, betaling, demo-vervolg of contact.' : 'Choose trial, payment, follow-up demo or contact.'}</p></article></div></div></section><!-- completion:end:conversion-depth -->`;
}

function pricingFaq(lang = 'en') {
  const nl = lang === 'nl';
  const faqs = nl ? [
    ['Kan ik starten met een proefperiode?','Ja. U kunt eerst een proefperiode aanvragen of een demo plannen voordat u betaalt.'],
    ['Heb ik een creditcard nodig?','Gebruik alleen de betaalroute wanneer u direct wilt afrekenen. Trial en demo kunnen via aanvraag lopen.'],
    ['Kunnen we later gebruikers toevoegen?','Ja, teamgrootte en implementatie kunnen later worden besproken.'],
    ['Wat gebeurt er na betaling?','De checkout toont bedrag, btw en gekozen cyclus voordat de Mollie-betaling wordt aangemaakt.'],
    ['Is implementatieondersteuning mogelijk?','Voor grotere teams kan implementatiecontext via contact of demo worden besproken.'],
    ['Kunnen we eerst een demo aanvragen?','Ja. Demo is geschikt wanneer u workflow, modules en dossiercontext eerst wilt zien.']
  ] : [
    ['Can I start with a trial?','Yes. You can request trial access or book a demo before choosing a paid route.'],
    ['Do I need a credit card?','Use the payment route only when you want to pay directly. Trial and demo can be requested separately.'],
    ['Can we add more users later?','Yes, team size and implementation scope can be discussed later.'],
    ['What happens after payment?','The checkout shows amount, VAT and billing cycle before the Mollie payment is created.'],
    ['Is implementation ondersteuning available?','Larger teams can discuss implementation context through contact or demo.'],
    ['Can we request a demo first?','Yes. Demo is useful when you want to review workflow, modules and dossier context first.']
  ];
  return `<!-- completion:start:pricing-faq --><section class="completion-band" data-completion="pricing-faq"><div class="container"><div class="section-head"><span class="kicker">FAQ</span><h2>${nl ? 'Veelgestelde vragen over prijzen en starten.' : 'Common questions about pricing and getting started.'}</h2></div><div class="completion-faq">${faqs.map(([q,a]) => `<article><h3>${q}</h3><p>${a}</p></article>`).join('')}</div></div></section><!-- completion:end:pricing-faq -->`;
}

function standardsDepth(lang = 'en') {
  const nl = lang === 'nl';
  const cards = nl ? [
    ['EN 1090','Projectuitvoering en CE-documentatiecontext.','/nl/en-1090-software'],
    ['ISO 3834','documentatiewerkprocessen rond laskwaliteit.','/iso-3834'],
    ['ISO 5817','Bevindingen en kwaliteitsniveau-context rond lascontrole.','/iso-5817'],
    ['ISO 9606-1','Lasserkwalificaties zichtbaar bij projectrecords.','/iso-9606-1'],
    ['WPS/WPQR','Procedureverwijzingen verbonden met laswerk.','/iso-15609'],
    ['Materiaaltraceerbaarheid','Certificaten, heatnummers en materiaalcontext.','/en-10204'],
    ['CE-documentatie','Dossiervoorbereiding en overdrachtscontext.','/nl/ce-dossier-software']
  ] : [
    ['EN 1090','Project execution and CE documentation context.','/en-1090'],
    ['ISO 3834','Welding quality documentation workflows.','/iso-3834'],
    ['ISO 5817','Inspection findings and quality level context.','/iso-5817'],
    ['ISO 9606-1','Welder qualification references near project records.','/iso-9606-1'],
    ['WPS/WPQR','Procedure references connected to weld work.','/iso-15609'],
    ['Material traceability','Certificates, heat numbers and material context.','/en-10204'],
    ['CE documentation','Dossier preparation and handover context.','/reports']
  ];
  const disclaimer = nl
    ? 'WeldInspect Pro ondersteunt werkprocessen en documentatie rondom relevante normen. Offici&euml;le normteksten, certificering, beoordeling door bevoegde personen en formele conformiteitsbesluiten blijven leidend.'
    : 'WeldInspect Pro supports documentation workflows around relevant standards. Official standard texts, certification, qualified review and formal conformity decisions remain leading.';
  return `<!-- completion:start:standards-depth --><section class="completion-band alt" data-completion="standards-depth"><div class="container"><div class="standards-disclaimer">${disclaimer}</div><div class="section-head"><span class="kicker">${nl ? 'Normcontext' : 'Standards context'}</span><h2>${nl ? 'Hoe normcontext aansluit op documentatiewerkprocessen.' : 'How standards context connects to documentation workflows.'}</h2><p>${nl ? 'Deze kaarten zijn werkprocesuitleg. Ze kopieren geen officiele normtekst en vervangen geen beoordeling door bevoegde personen.' : 'These cards are workflow explanations. They do not reproduce official standard text or replace qualified review.'}</p></div><div class="knowledge-grid">${cards.map(([t,p,u]) => `<a class="knowledge-card" href="${u}"><span>${t}</span><h3>${t}</h3><p>${p}</p></a>`).join('')}</div><div class="standards-disclaimer">${disclaimer}</div></div></section><!-- completion:end:standards-depth -->`;
}

function resourcesDepth(lang = 'en') {
  const nl = lang === 'nl';
  const cards = nl ? [
    ['Lasinspectie','Lasinspecties digitaal vastleggen','/nl/lasinspectie-software'],
    ['EN 1090','EN 1090-documentatie beter organiseren','/nl/en-1090-software'],
    ['CE-dossier','CE-dossier opbouwen tijdens uitvoering','/nl/ce-dossier-software'],
    ['WPS/WPQ','WPS/WPQ-documentatie overzichtelijk koppelen','/nl/wps-wpq-beheer'],
    ['Traceerbaarheid','Materiaaltraceerbaarheid in staalbouwprojecten','/nl/ce-dossier-software'],
    ['Overdracht','Van inspectiefoto naar bruikbaar bewijs','/nl/blog/']
  ] : [
    ['Weld inspection','Digital weld inspection records explained','/inspections'],
    ['EN 1090','How to prepare a weld dossier during execution','/standards'],
    ['CE dossier','CE dossier preparation without last-minute chasing','/reports'],
    ['WPS/WPQ','WPS/WPQ documentation in project workflows','/platform'],
    ['Traceability','Material traceability for steel construction teams','/en-10204'],
    ['Handover','From inspection photos to structured evidence','/reports']
  ];
  return `<!-- completion:start:resources-depth --><section class="completion-band" data-completion="resources-depth"><div class="container"><div class="section-head"><span class="kicker">${nl ? 'Kenniscentrum' : 'Knowledge centre'}</span><h2>${nl ? 'Praktische categorie&euml;n voor lasinspectie en dossieropbouw.' : 'Practical categories for weld inspection and documentation teams.'}</h2></div><div class="knowledge-grid">${cards.map(([c,t,u]) => `<a class="knowledge-card" href="${u}"><span>${c}</span><h3>${t}</h3><p>${nl ? 'Lees hoe dit onderwerp terugkomt in projecten, inspecties, bewijs en overdracht.' : 'See how this topic appears in projects, inspections, evidence and handover.'}</p></a>`).join('')}</div></div></section><!-- completion:end:resources-depth -->`;
}

function normalizeDutch(html) {
  const replacements = [
    ['Projects','Projecten'], ['Welds','Lassen'], ['Inspections','Inspecties'], ['Documents','Documenten'],
    ['Evidence','Bewijs'], ['Reporting','Rapportage'], ['Traceability','Traceerbaarheid'], ['Handover','Overdracht'],
    ['Open actions','Open acties'], ['Project overview','Projectoverzicht'], ['Documentation workflow','documentatiewerkproces'],
    ['Connected','Verbonden'], ['Controlled','Gecontroleerd'], ['Total records','Totaal aantal records'], ['Linked records','Gekoppelde records'],
    ['Visual inspection recorded','Visuele inspectie vastgelegd'], ['Procedure context linked','Procedurecontext gekoppeld'],
    ['Material batch linked','Materiaalbatch gekoppeld'], ['Inspection evidence linked','Inspectiebewijs gekoppeld'],
    ['Material certificate attached','Materiaalcertificaat gekoppeld'], ['Photos, notes and status on the weld record','Foto&rsquo;s, notities en status bij de las'],
    ['Procedure context near inspection work','Procedurecontext bij inspectiewerk'], ['Traceability evidence in the project dossier','Traceerbaarheidsbewijs in het projectdossier'],
    ['Weld list','Lasregister'], ['Inspection overview','Inspectieoverzicht'], ['Start Free Trial','Start proefperiode'],
    ['Book a Demo','Plan demo'], ['Book a demo','Plan demo'], ['View pricing','Bekijk prijzen'], ['Contact sales','Neem contact op'],
    ['Standards','Normen'], ['Best practices','Praktijkgidsen'], ['Ready for review','Klaar voor review'],
    ['Organise project scope, teams, inspection requirements and handover context before work starts.','Organiseer projectscope, rollen, inspectie-eisen en overdrachtscontext voordat werk start.'],
    ['Use a structured weld list as the anchor for inspection status, evidence and documentation.','Gebruik een gestructureerd lasregister als basis voor status, bewijs en documentatie.'],
    ['Record visual checks, findings, open points, photos and review status in one workflow.','Leg visuele controles, bevindingen, open punten, foto&rsquo;s en reviewstatus vast in een workflow.'],
    ['Keep procedure and qualification references visible alongside weld and project records.','Houd procedure- en kwalificatieverwijzingen zichtbaar naast las- en projectrecords.'],
    ['Link drawings, certificates, reports and evidence to the right project context.','Koppel tekeningen, certificaten, rapporten en bewijs aan de juiste projectcontext.'],
    ['Prepare a clear dossier overview while the project is active, not at the end.','Bereid een duidelijk dossieroverzicht voor terwijl het project loopt, niet pas aan het einde.'],
    ['Connect material context, heat numbers, welds, certificates and ondersteuninging records.','Verbind materiaalcontext, heatnummers, lassen, certificaten en ondersteunende records.'],
    ['Turn structured inspection records into clearer review and handover conversations.','Gebruik gestructureerde inspectierecords voor duidelijkere review en overdracht.'],
    ['WPS approved','WPS goedgekeurd'],
    ['Traceerbaarheid evidence attached','Traceerbaarheidsbewijs gekoppeld'],
    ['Weld W-1024 - Project Bridge A','Las W-1024 - Project Brug A'],
    ['Weld inspection','Lasinspectie'],
    ['EN 1090 documentation','EN 1090-documentatie'],
    ['CE dossier preparation','CE-dossiervoorbereiding'],
    ['WPS/WPQ, evidence and document context','WPS/WPQ, bewijs en documentcontext']
  ];
  for (const [a, b] of replacements) html = html.replaceAll(a, b);
  return html
    .replaceAll('fotoâ€™s', 'foto&rsquo;s')
    .replaceAll('Fotoâ€™s', 'Foto&rsquo;s')
    .replaceAll('coordinatie', 'co&ouml;rdinatie')
    .replaceAll('Lascoordinator', 'Lasco&ouml;rdinator')
    .replaceAll('Inspectiecoordinator', 'Inspectieco&ouml;rdinator')
    .replaceAll('Officiele', 'Offici&euml;le')
    .replaceAll('officiele', 'offici&euml;le')
    .replaceAll('Categorieen', 'Categorie&euml;n');
}

function cleanupMojibake(html) {
  return html
    .replaceAll('â€™', '&rsquo;')
    .replaceAll('Â·', '&middot;')
    .replaceAll('Ã©', '&eacute;')
    .replaceAll('Ã«', '&euml;')
    .replaceAll('Ã¶', '&ouml;')
    .replaceAll('coÃ¶rdinator', 'co&ouml;rdinator');
}

function polishVisibleClaims(html) {
  return html
    .replaceAll('guaranteed compliance', 'automatic conformity')
    .replaceAll('guaranteed Compliance', 'automatic conformity')
    .replaceAll('foto’s', 'foto&rsquo;s')
    .replaceAll('Foto’s', 'Foto&rsquo;s')
    .replaceAll('kopieren geen officiele', 'kopi&euml;ren geen offici&euml;le');
}

function fixCanonical(html, route) {
  const clean = route === 'index.html' ? '/' : route.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/^/, '/');
  const canonical = `https://weldinspectpro.com${clean}`;
  html = html.replace(/<link rel="canonical" href="https:\/\/weldinspectpro\.com[^"]*">/, `<link rel="canonical" href="${canonical}">`);
  html = html.replace(/<meta property="og:url" content="https:\/\/weldinspectpro\.com[^"]*">/, `<meta property="og:url" content="${canonical}">`);
  return html;
}

function cleanInternalHtmlHrefs(html) {
  return html.replace(/href="([^"#?:]+)\.html(#[^"]*)?"/g, (m, path, hash = '') => {
    if (['/legal','/terms','/privacy','/dpa','legal','terms','privacy','dpa'].includes(path)) return m;
    if (path.startsWith('mailto') || path.startsWith('http')) return m;
    const clean = path.endsWith('/index') ? path.slice(0, -6) : path;
    return `href="${clean}${hash}"`;
  });
}

function restoreRequiredLegalLinks(html) {
  return html
    .replaceAll('href="/legal"', 'href="/legal.html"')
    .replaceAll('href="/terms"', 'href="/terms.html"')
    .replaceAll('href="/privacy"', 'href="/privacy.html"')
    .replaceAll('href="/dpa"', 'href="/dpa.html"');
}

const keyPages = [
  'index.html','platform.html','inspections.html','reports.html','pricing.html','demo.html','trial.html','contact.html','standards.html','resources.html','security.html','use-cases.html','case-studies.html','privacy.html','terms.html','legal.html','dpa.html',
  'nl/index.html','nl/lasinspectie-software.html','nl/en-1090-software.html','nl/ce-dossier-software.html','nl/prijzen.html','nl/demo.html','nl/trial.html','nl/contact.html','nl/blog/index.html'
];

for (const file of walk()) {
  let html = polishVisibleClaims(cleanupMojibake(ensureCss(read(file))));
  if (file.startsWith('nl/')) html = normalizeDutch(html);
  html = fixCanonical(html, file);
  html = cleanInternalHtmlHrefs(html);
  html = restoreRequiredLegalLinks(html);
  write(file, html);
}

for (const file of ['index.html', 'nl/index.html']) {
  const lang = file.startsWith('nl/') ? 'nl' : 'en';
  write(file, beforeFinal(read(file), 'product-story', productStory(lang)));
}

write('platform.html', beforeFinal(read('platform.html'), 'platform-depth', platformSection()));
write('inspections.html', beforeFinal(read('inspections.html'), 'inspection-depth', inspectionsSection()));
write('reports.html', beforeFinal(read('reports.html'), 'reports-depth', reportsSection()));
write('nl/lasinspectie-software.html', beforeFinal(read('nl/lasinspectie-software.html'), 'inspection-depth', inspectionsSection('nl')));
write('nl/ce-dossier-software.html', beforeFinal(read('nl/ce-dossier-software.html'), 'reports-depth', reportsSection('nl')));
write('nl/en-1090-software.html', beforeFinal(read('nl/en-1090-software.html'), 'standards-depth', standardsDepth('nl')));

write('standards.html', afterHero(read('standards.html'), 'standards-depth', standardsDepth()));
write('resources.html', beforeFinal(read('resources.html'), 'resources-depth', resourcesDepth()));
write('nl/blog/index.html', beforeFinal(read('nl/blog/index.html'), 'resources-depth', resourcesDepth('nl')));

for (const type of ['demo','trial','contact']) {
  write(`${type}.html`, beforeFinal(read(`${type}.html`), 'conversion-depth', conversionSection('en', type)));
  write(`nl/${type}.html`, beforeFinal(read(`nl/${type}.html`), 'conversion-depth', conversionSection('nl', type)));
}
write('pricing.html', beforeFinal(read('pricing.html'), 'pricing-faq', pricingFaq()));
write('nl/prijzen.html', beforeFinal(read('nl/prijzen.html'), 'pricing-faq', pricingFaq('nl')));

writeFileSync(join(root, 'assets/images/visuals/README.md'), `# WeldInspect Pro product visuals

Generated product-focused SVG visuals for the marketing website premium completion build.
They are illustrative product views, not customer data and not screenshots from the app codebase.
`, 'utf8');

console.log(`Premium completion applied to ${keyPages.length} core routes and ${Object.keys(visuals).length} product visuals.`);
