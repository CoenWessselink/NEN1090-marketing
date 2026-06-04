import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), 'utf8');
const write = (file, value) => writeFileSync(join(root, file), value);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '.git' || entry === 'node_modules') continue;
    const absolute = join(dir, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) out.push(...walk(absolute));
    else out.push(absolute.slice(root.length + 1).replaceAll('\\', '/'));
  }
  return out;
}

function stripBlock(html, name) {
  return html.replace(new RegExp(`\\n?<!-- ${name}:start -->[\\s\\S]*?<!-- ${name}:end -->\\n?`, 'g'), '');
}

function insertBeforeFinalCta(html, name, block) {
  html = stripBlock(html, name);
  const marker = '<section class="final-cta';
  if (html.includes(marker)) return html.replace(marker, `${block}${marker}`);
  return html.replace('</main>', `${block}</main>`);
}

function card(title, text) {
  return `<article><h3>${title}</h3><p>${text}</p></article>`;
}

function trustEn(page = 'site') {
  const intro = page === 'pricing'
    ? 'Choose how to evaluate the product before payment: trial, demo, direct monthly checkout, yearly checkout or an implementation conversation.'
    : 'Review the workflow, product routes and documentation context before making a commercial decision.';
  return `<!-- final-trust:start --><section class="section evaluation-confidence"><div class="container"><div class="section-head"><span class="kicker">Evaluation confidence</span><h2>Built for careful B2B evaluation, without fake proof.</h2><p>${intro}</p></div><div class="evaluation-grid">${card('Transparent routes', 'Pricing, trial, demo, contact, privacy, terms and DPA pages are visible before a team commits.')}${card('Product workflow first', 'Teams can review projects, welds, inspections, WPS/WPQ context, evidence, documents and dossier preparation before checkout.')}${card('Standards context stays careful', 'WeldInspect Pro supports documentation workflows around relevant standards. Official standard texts, certification, qualified review and formal conformity decisions remain leading.')}${card('Not a black box', 'Ask for a guided walkthrough to see project setup, weld records, inspection evidence, Dossier readiness and handover output together.')}</div></div></section><!-- final-trust:end -->`;
}

function trustNl(page = 'site') {
  const intro = page === 'pricing'
    ? 'Kies eerst de passende evaluatieroute: proefperiode, demo, direct maandelijks betalen, jaarlijks betalen of een implementatiegesprek.'
    : 'Bekijk het werkproces, de productroutes en de documentatiecontext voordat uw team een commerciële keuze maakt.';
  return `<!-- final-trust:start --><section class="section evaluation-confidence"><div class="container"><div class="section-head"><span class="kicker">Evaluatievertrouwen</span><h2>Gebouwd voor zorgvuldige B2B-evaluatie, zonder verzonnen bewijs.</h2><p>${intro}</p></div><div class="evaluation-grid">${card('Transparante routes', 'Prijzen, proefperiode, demo, contact, privacy, voorwaarden en verwerkersovereenkomst zijn zichtbaar voordat een team beslist.')}${card('Eerst het productwerkproces', 'Teams kunnen projecten, lassen, inspecties, WPS/WPQ-context, bewijs, documenten en dossieropbouw beoordelen vóór betaling.')}${card('Voorzichtige normcontext', 'WeldInspect Pro ondersteunt werkprocessen en documentatie rondom relevante normen. Officiële normteksten, certificering, beoordeling door bevoegde personen en formele conformiteitsbesluiten blijven leidend.')}${card('Geen ondoorzichtige keuze', 'Vraag een begeleide demo om projectinrichting, lasrecords, inspectiebewijs, dossiergereedheid en overdracht samen te bekijken.')}</div></div></section><!-- final-trust:end -->`;
}

function productWalkthroughEn(kind = 'default') {
  const images = kind === 'trial'
    ? ['product-mobile-inspection.svg', 'product-evidence-panel.svg', 'product-ce-dossier-readiness.svg']
    : kind === 'pricing'
      ? ['product-pricing-onboarding.svg', 'product-project-overview.svg', 'product-report-preview.svg']
      : kind === 'demo'
        ? ['product-demo-walkthrough.svg', 'product-inspection-record.svg', 'product-report-preview.svg']
        : ['product-project-overview.svg', 'product-weld-register.svg', 'product-inspection-record.svg'];
  return `<!-- final-product:start --><section class="section product-proof"><div class="container"><div class="section-head"><span class="kicker">Product walkthrough</span><h2>Different views for each stage of weld documentation work.</h2><p>Project setup, weld registration, field inspection, evidence review, dossier preparation and handover each need their own context.</p></div><div class="product-proof-grid">${images.map((image, index) => `<article class="product-proof-card"><img src="/assets/images/visuals/${image}" alt="${['Project and weld documentation view','Inspection and evidence record view','Dossier readiness and reporting view'][index]}"><div><h3>${['Project setup and weld register','Inspection record and evidence','Dossier readiness and handover'][index]}</h3><p>${['Set project scope, roles, weld numbers and WPS/WPQ context before inspection work starts.','Capture findings, photos, notes and open actions while the work is still visible.','Review documents, evidence and open points before delivery pressure peaks.'][index]}</p></div></article>`).join('')}</div></div></section><!-- final-product:end -->`;
}

function productWalkthroughNl(kind = 'default') {
  const images = kind === 'trial'
    ? ['nl-product-mobile-inspection.svg', 'nl-product-evidence-panel.svg', 'nl-product-ce-dossier-readiness.svg']
    : kind === 'pricing'
      ? ['nl-product-pricing-onboarding.svg', 'nl-product-project-overview.svg', 'nl-product-report-preview.svg']
      : kind === 'demo'
        ? ['nl-product-demo-walkthrough.svg', 'nl-product-inspection-record.svg', 'nl-product-report-preview.svg']
        : ['nl-product-project-overview.svg', 'nl-product-weld-register.svg', 'nl-product-inspection-record.svg'];
  return `<!-- final-product:start --><section class="section product-proof"><div class="container"><div class="section-head"><span class="kicker">Productdoorloop</span><h2>Elke fase van lasdocumentatie heeft een eigen productweergave.</h2><p>Projectinrichting, lasregistratie, veldinspectie, bewijscontrole, dossieropbouw en overdracht vragen elk om andere context.</p></div><div class="product-proof-grid">${images.map((image, index) => `<article class="product-proof-card"><img src="/assets/images/visuals/${image}" alt="${['Project- en lasdocumentatie','Inspectieverslag en bewijs','Dossiergereedheid en rapportage'][index]}"><div><h3>${['Projectinrichting en lasregister','Inspectieverslag en bewijs','Dossiergereedheid en overdracht'][index]}</h3><p>${['Leg projectscope, rollen, lasnummers en WPS/WPQ-context vast voordat inspectiewerk start.','Registreer bevindingen, foto’s, notities en open punten terwijl het werk nog zichtbaar is.','Controleer documenten, bewijs en open punten voordat de opleverdruk oploopt.'][index]}</p></div></article>`).join('')}</div></div></section><!-- final-product:end -->`;
}

function trialEn() {
  return `<!-- final-trial:start --><section class="section section-alt trial-clarity"><div class="container"><div class="section-head"><span class="kicker">Trial onboarding</span><h2>Know what to evaluate before your team starts.</h2><p>The trial is designed to help teams evaluate the core documentation workflow before choosing a paid plan. Access details are confirmed during signup or follow-up.</p></div><div class="evaluation-grid">${card('What you can review', 'Project workflow, weld register structure, inspection records, evidence and document linking, dossier status and reporting handover flow.')}${card('Proefperiode, demo or contact', 'Use trial for self-guided evaluation, demo for a guided walkthrough and contact for implementation, team, pricing or documentation questions.')}${card('Before you start', 'Choose a representative project, list the documents you want to follow and gather questions from QA/QC, welding coordination and documentation stakeholders.')}${card('After evaluation', 'Compare workflow fit, pricing route and implementation questions before continuing to checkout or a commercial conversation.')}</div><div class="completion-faq">${card('Do I need a credit card?', 'The trial route is presented as no credit card required on the site. Payment is handled separately through pricing checkout when you choose a paid plan.')}${card('Can I request a demo first?', 'Yes. The demo route is intended for teams that want a guided product walkthrough before starting or paying.')}</div></div></section><!-- final-trial:end -->`;
}

function trialNl() {
  return `<!-- final-trial:start --><section class="section section-alt trial-clarity"><div class="container"><div class="section-head"><span class="kicker">Proefperiode starten</span><h2>Weet vooraf wat uw team kan beoordelen.</h2><p>De proefperiode is bedoeld om het kernwerkproces voor documentatie te evalueren voordat u een betaald abonnement kiest. Toegang en inrichting worden bevestigd tijdens aanmelding of opvolging.</p></div><div class="evaluation-grid">${card('Wat u kunt beoordelen', 'Projectwerkproces, lasregisterstructuur, inspectieverslagen, koppeling van bewijs en documenten, dossierstatus en rapportage voor overdracht.')}${card('Proefperiode, demo of contact', 'Gebruik de proefperiode voor zelfstandig verkennen, de demo voor begeleiding en contact voor implementatie-, team-, prijs- of documentatievragen.')}${card('Voor u start', 'Kies een representatief project, noteer welke documenten u wilt volgen en verzamel vragen van kwaliteitscontrole, lascoördinatie en documentatie.')}${card('Na evaluatie', 'Vergelijk productfit, prijsroute en implementatievragen voordat u doorgaat naar betalen of een commercieel gesprek.')}</div><div class="completion-faq">${card('Heb ik een creditcard nodig?', 'De proefperiode wordt op de site gepresenteerd als zonder creditcard. Betaling loopt apart via de prijs- en checkoutpagina wanneer u een betaald abonnement kiest.')}${card('Kan ik eerst een demo aanvragen?', 'Ja. De demo is bedoeld voor teams die eerst begeleid door het product en de werkprocessen willen lopen.')}</div></div></section><!-- final-trial:end -->`;
}

function pricingEn() {
  return `<!-- final-pricing:start --><section class="section section-alt pricing-evaluation"><div class="container"><div class="section-head"><span class="kicker">Before choosing a plan</span><h2>Pick the route that matches your buying process.</h2><p>Transparent checkout is useful when you are ready, but B2B teams often want to review workflow fit, privacy pages and implementation questions first.</p></div><div class="scope-table"><table><thead><tr><th>Evaluation point</th><th>Trial</th><th>Monthly</th><th>Yearly</th><th>Custom</th></tr></thead><tbody><tr><td>Product evaluation</td><td>Self-guided</td><td>Start paid</td><td>Start paid</td><td>Discuss first</td></tr><tr><td>Project and weld workflow</td><td>Review fit</td><td>Included route</td><td>Included route</td><td>Map rollout</td></tr><tr><td>Inspection documentation</td><td>Evaluate records</td><td>Use in plan</td><td>Use in plan</td><td>Discuss teams</td></tr><tr><td>Evidence and handover context</td><td>Review flow</td><td>Use in plan</td><td>Use in plan</td><td>Map needs</td></tr><tr><td>Implementation questions</td><td>Contact</td><td>Contact</td><td>Contact</td><td>Primary route</td></tr></tbody></table></div><div class="choice-cta"><h3>Not ready to pay yet?</h3><p>Start with trial, book a demo or contact us before continuing to Mollie checkout.</p><a class="btn btn-primary" href="/trial">Start trial</a><a class="btn btn-outline" href="/demo">Book demo</a><a class="btn btn-ghost" href="/contact">Contact</a></div></div></section><!-- final-pricing:end -->`;
}

function pricingNl() {
  return `<!-- final-pricing:start --><section class="section section-alt pricing-evaluation"><div class="container"><div class="section-head"><span class="kicker">Voor u een abonnement kiest</span><h2>Kies de route die past bij uw aankoopproces.</h2><p>Transparante checkout is handig wanneer u klaar bent, maar B2B-teams willen vaak eerst productfit, privacydocumenten en implementatievragen beoordelen.</p></div><div class="scope-table"><table><thead><tr><th>Evaluatiepunt</th><th>Proefperiode</th><th>Maandelijks</th><th>Jaarlijks</th><th>Maatwerk</th></tr></thead><tbody><tr><td>Productevaluatie</td><td>Zelfstandig</td><td>Betaald starten</td><td>Betaald starten</td><td>Eerst bespreken</td></tr><tr><td>Project- en laswerkproces</td><td>Productfit beoordelen</td><td>Plan gebruiken</td><td>Plan gebruiken</td><td>Uitrol bespreken</td></tr><tr><td>Inspectiedocumentatie</td><td>Records beoordelen</td><td>Plan gebruiken</td><td>Plan gebruiken</td><td>Teamvragen bespreken</td></tr><tr><td>Bewijs en overdracht</td><td>Werkproces bekijken</td><td>Plan gebruiken</td><td>Plan gebruiken</td><td>Behoefte bepalen</td></tr><tr><td>Implementatievragen</td><td>Contact</td><td>Contact</td><td>Contact</td><td>Hoofdroute</td></tr></tbody></table></div><div class="choice-cta"><h3>Nog niet klaar om te betalen?</h3><p>Start met de proefperiode, plan een demo of neem contact op voordat u doorgaat naar Mollie checkout.</p><a class="btn btn-primary" href="/nl/trial">Start proefperiode</a><a class="btn btn-outline" href="/nl/demo">Plan demo</a><a class="btn btn-ghost" href="/nl/contact">Contact</a></div></div></section><!-- final-pricing:end -->`;
}

function demoEn() {
  return `<!-- final-demo:start --><section class="section demo-depth"><div class="container"><div class="section-head"><span class="kicker">Guided walkthrough</span><h2>Use the demo to test fit with real stakeholder questions.</h2><p>A demo can focus on welding coordination, QA/QC review, document control, reporting or implementation planning.</p></div><div class="evaluation-grid">${card('Project setup', 'Map project scope, roles, inspection timing and handover expectations before the walkthrough starts.')}${card('Weld and WPS/WPQ context', 'Check how weld numbers, WPS/WPQ references, inspection status and open actions stay together.')}${card('Evidence and dossier preparation', 'Review where photos, findings, certificates and documents attach to the right weld or project record.')}${card('Next step after demo', 'Choose trial, direct pricing checkout or a follow-up conversation for implementation and documentation questions.')}</div></div></section><!-- final-demo:end -->`;
}

function demoNl() {
  return `<!-- final-demo:start --><section class="section demo-depth"><div class="container"><div class="section-head"><span class="kicker">Begeleide productdoorloop</span><h2>Gebruik de demo om productfit met echte teamvragen te toetsen.</h2><p>Een demo kan draaien om lascoördinatie, kwaliteitscontrole, documentbeheer, rapportage of implementatieplanning.</p></div><div class="evaluation-grid">${card('Projectinrichting', 'Bespreek projectscope, rollen, inspectiemomenten en overdrachtsverwachtingen voordat de demo start.')}${card('Lasregister en WPS/WPQ-context', 'Bekijk hoe lasnummers, WPS/WPQ-verwijzingen, inspectiestatus en open punten bij elkaar blijven.')}${card('Bewijs en dossieropbouw', 'Controleer waar foto’s, bevindingen, certificaten en documenten aan de juiste las of projectrecord worden gekoppeld.')}${card('Vervolg na de demo', 'Kies proefperiode, directe checkout of een vervolgafspraak voor implementatie- en documentatievragen.')}</div></div></section><!-- final-demo:end -->`;
}

function contactEn() {
  return `<!-- final-contact:start --><section class="section contact-depth"><div class="container"><div class="section-head"><span class="kicker">Contact routes</span><h2>Ask the question that matches your buying stage.</h2><p>Use contact for product questions, trial help, demo planning, pricing, implementation, standards documentation, privacy/DPA or ondersteuning.</p></div><div class="evaluation-grid">${card('Product and workflow', 'Ask how projects, welds, inspections, documents and dossier preparation can fit your current process.')}${card('Commercial route', 'Check whether trial, demo, monthly checkout, yearly checkout or a custom discussion is the right next step.')}${card('Implementation', 'Discuss stakeholders, rollout order, document structure and handover expectations before changing a team process.')}${card('Privacy and legal', 'Review privacy, terms and DPA pages before sending implementation or data processing questions.')}</div></div></section><!-- final-contact:end -->`;
}

function contactNl() {
  return `<!-- final-contact:start --><section class="section contact-depth"><div class="container"><div class="section-head"><span class="kicker">Contactroutes</span><h2>Stel de vraag die past bij uw beslismoment.</h2><p>Gebruik contact voor productvragen, hulp bij de proefperiode, demo-afspraken, prijzen, implementatie, normdocumentatie, privacy/verwerkersovereenkomst of ondersteuning.</p></div><div class="evaluation-grid">${card('Product en werkproces', 'Vraag hoe projecten, lassen, inspecties, documenten en dossieropbouw kunnen passen bij uw huidige proces.')}${card('Commerciële route', 'Bepaal of proefperiode, demo, maandelijkse checkout, jaarlijkse checkout of maatwerkbespreking de beste vervolgstap is.')}${card('Implementatie', 'Bespreek stakeholders, uitrolvolgorde, documentstructuur en overdrachtsverwachtingen voordat een teamproces verandert.')}${card('Privacy en juridisch', 'Bekijk privacy, voorwaarden en verwerkersovereenkomst voordat u implementatie- of verwerkingsvragen stelt.')}</div></div></section><!-- final-contact:end -->`;
}

const publicReplacements = new Map([
  ['Useful guidance without thin content.', 'Practical guidance for weld inspection and documentation teams.'],
  ['Guides, explainers and workflow articles for quality teams.', 'Guides, explainers and practical documentation articles for quality teams.'],
  ['Navigate by workflow.', 'Navigate by documentation topic.'],
  ['Book a demo', 'Book a demo'],
  ['14 Days', 'Evaluation'],
  ['30 Min', 'Guided'],
  ['3 Flows', 'Core flow'],
  ['0 Card needed', 'No card'],
  ['Workflow selected', 'Evaluation focus selected'],
  ['Proefperiode, demo or contact', 'Proefperiode, demo or contact route'],
  ['Review projects, welds and inspections', 'Review project, weld and inspection context'],
  ['WPS/WPQ, evidence and document context', 'Review WPS/WPQ, evidence and document context'],
  ['14 Dagen', 'Evaluatie'],
  ['3 Flows', 'Kernproces'],
  ['0 Kaart nodig', 'Geen kaart'],
  ['Workflow gekozen', 'Evaluatiefocus gekozen'],
  ['Proefperiode, demo of contact', 'Proefperiode, demo of contactroute'],
  ['92 Documents', '92 Documenten'],
  ['12</b>Documenten', '12</b>Documenten'],
]);

const scriptReplacements = new Map([
  ['They are illustrative product views, not customer data and not screenshots from the app codebase.', 'They are illustrative product views, not customer data and not screenshots from the app codebase.'],
  ['productView', 'productView'],
  ['repeated cards', 'repeated cards'],
  ['herhaalde kaarten', 'herhaalde kaarten'],
  ['product view', 'product view'],
  ['setup patterns', 'setup patterns'],
  ['setup pattern', 'setup pattern'],
  ['Different product views:', 'Different product views:'],
  ['thin product copy', 'thin product copy'],
  ['Specific product moments', 'Specific product moments'],
  ['Dedicated story and product view', 'Dedicated story and product view'],
  ['practical reader need', 'practical reader need'],
  ['Knowledge workflow overview', 'Knowledge workflow overview'],
  ['No repeated repeated cards', 'Different product views'],
  ['thin content', 'thin content'],
]);

for (const file of walk(root).filter((f) => f.endsWith('.html'))) {
  let html = read(file);
  for (const [from, to] of publicReplacements) html = html.replaceAll(from, to);
  if (file.startsWith('nl/')) {
    html = html
      .replace(/\bworkflows\b/gi, 'werkprocessen')
      .replace(/\bworkflow\b/gi, 'werkproces')
      .replace(/\btraceability\b/gi, 'traceerbaarheid')
      .replace(/\bcompliance\b/gi, 'normcontext')
      .replace(/\baudit-ready output\b/gi, 'controleerbare output')
      .replace(/\bdossier-readiness\b/gi, 'dossiergereedheid')
      .replace(/Digitale werkprocess voor/gi, 'Digitaal werkproces voor')
      .replace(/CE-dossieropbouwen/gi, 'CE-dossieropbouw')
      .replace(/Email/g, 'E-mail')
      .replace(/Productreview/g, 'Productbeoordeling')
      .replace(/Inspectieflow/g, 'Inspectieproces')
      .replace(/Fit/g, 'Passend');
  }
  write(file, html);
}

for (const file of ['index.html', 'platform.html', 'inspections.html', 'reports.html']) {
  let html = read(file);
  html = insertBeforeFinalCta(html, 'final-product', productWalkthroughEn());
  html = insertBeforeFinalCta(html, 'final-trust', trustEn());
  write(file, html);
}

for (const file of ['nl/index.html', 'nl/lasinspectie-software.html', 'nl/ce-dossier-software.html', 'nl/en-1090-software.html']) {
  let html = read(file);
  html = insertBeforeFinalCta(html, 'final-product', productWalkthroughNl());
  html = insertBeforeFinalCta(html, 'final-trust', trustNl());
  write(file, html);
}

for (const file of ['trial.html']) {
  let html = read(file);
  html = insertBeforeFinalCta(html, 'final-product', productWalkthroughEn('trial'));
  html = insertBeforeFinalCta(html, 'final-trial', trialEn());
  html = insertBeforeFinalCta(html, 'final-trust', trustEn('trial'));
  write(file, html);
}

for (const file of ['nl/trial.html']) {
  let html = read(file);
  html = insertBeforeFinalCta(html, 'final-product', productWalkthroughNl('trial'));
  html = insertBeforeFinalCta(html, 'final-trial', trialNl());
  html = insertBeforeFinalCta(html, 'final-trust', trustNl('trial'));
  write(file, html);
}

for (const file of ['pricing.html']) {
  let html = read(file);
  html = insertBeforeFinalCta(html, 'final-product', productWalkthroughEn('pricing'));
  html = insertBeforeFinalCta(html, 'final-pricing', pricingEn());
  html = insertBeforeFinalCta(html, 'final-trust', trustEn('pricing'));
  write(file, html);
}

for (const file of ['nl/prijzen.html']) {
  let html = read(file);
  html = insertBeforeFinalCta(html, 'final-product', productWalkthroughNl('pricing'));
  html = insertBeforeFinalCta(html, 'final-pricing', pricingNl());
  html = insertBeforeFinalCta(html, 'final-trust', trustNl('pricing'));
  write(file, html);
}

for (const file of ['demo.html']) {
  let html = read(file);
  html = insertBeforeFinalCta(html, 'final-product', productWalkthroughEn('demo'));
  html = insertBeforeFinalCta(html, 'final-demo', demoEn());
  html = insertBeforeFinalCta(html, 'final-trust', trustEn('demo'));
  write(file, html);
}

for (const file of ['nl/demo.html']) {
  let html = read(file);
  html = insertBeforeFinalCta(html, 'final-product', productWalkthroughNl('demo'));
  html = insertBeforeFinalCta(html, 'final-demo', demoNl());
  html = insertBeforeFinalCta(html, 'final-trust', trustNl('demo'));
  write(file, html);
}

for (const file of ['contact.html']) {
  let html = read(file);
  html = insertBeforeFinalCta(html, 'final-contact', contactEn());
  html = insertBeforeFinalCta(html, 'final-trust', trustEn('contact'));
  write(file, html);
}

for (const file of ['nl/contact.html']) {
  let html = read(file);
  html = insertBeforeFinalCta(html, 'final-contact', contactNl());
  html = insertBeforeFinalCta(html, 'final-trust', trustNl('contact'));
  write(file, html);
}

for (const file of ['resources.html', 'nl/blog.html', 'nl/blog/index.html']) {
  if (!read(file)) continue;
  let html = read(file);
  html = insertBeforeFinalCta(html, 'final-trust', file.startsWith('nl/') ? trustNl() : trustEn());
  write(file, html);
}

for (const file of walk(root).filter((f) => f.startsWith('scripts/') && (f.endsWith('.mjs') || f.endsWith('.js')))) {
  let text = read(file);
  for (const [from, to] of scriptReplacements) text = text.replaceAll(from, to);
  write(file, text);
}

console.log('Final trust, product and conversion sections applied.');
