import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';

const root = process.cwd();

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

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function write(path, content) {
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, 'utf8');
}

function insertBefore(html, marker, content) {
  if (html.includes(content)) return html;
  const index = html.indexOf(marker);
  if (index === -1) throw new Error(`Marker not found: ${marker}`);
  return `${html.slice(0, index)}${content}${html.slice(index)}`;
}

function insertBeforeTrustOrCta(html, content) {
  if (html.includes(content)) return html;
  const marker = html.includes('<!-- final-trust:start -->')
    ? '<!-- final-trust:start -->'
    : '<section class="final-cta';
  return insertBefore(html, marker, content);
}

const tascheLogo = `<div class="tasche-logo-shell"><img class="tasche-logo" src="/assets/images/logos/tasche-staalbouw-logo.svg" alt="Tasche Staalbouw logo" width="186" height="55" loading="lazy" decoding="async"></div>`;
const tascheLogoLarge = `<div class="tasche-logo-shell large"><img class="tasche-logo" src="/assets/images/logos/tasche-staalbouw-logo.svg" alt="Tasche Staalbouw logo" width="186" height="55" decoding="async"></div>`;
const legacyTascheLogo = /<div class="tasche-wordmark" role="img" aria-label="Tasche Staalbouw logo"><strong>TASCHE<\/strong><span>STAALBOUW<\/span><small>Albergen - Fleringen<\/small><\/div>/g;
const legacyTascheLogoLarge = /<div class="tasche-wordmark large" role="img" aria-label="Tasche Staalbouw logo"><strong>TASCHE<\/strong><span>STAALBOUW<\/span><small>Albergen - Fleringen<\/small><\/div>/g;

const trustEn = `<section class="section customer-reference" aria-labelledby="tasche-reference-title"><div class="container customer-reference-grid"><div class="customer-reference-brand"><span class="customer-reference-label">Customer reference</span>${tascheLogo}<p>In use by Tasche Staalbouw for clearer weld inspection, project documentation and dossier preparation.</p></div><figure class="customer-quote"><blockquote id="tasche-reference-title">&ldquo;WeldInspect Pro gives us much more overview in weld inspections, project documentation and dossier preparation. The workflow fits our steel construction practice well, and the reporting looks professional and well presented.&rdquo;</blockquote><figcaption>&mdash; Tasche Staalbouw</figcaption><a class="text-link" href="/case-studies/tasche-staalbouw">Read the customer reference</a></figure></div></section>`;
const trustNl = `<section class="section customer-reference" aria-labelledby="tasche-reference-title"><div class="container customer-reference-grid"><div class="customer-reference-brand"><span class="customer-reference-label">Klantreferentie</span>${tascheLogo}<p>In gebruik bij Tasche Staalbouw voor meer overzicht in lasinspecties, projectdocumentatie en dossieropbouw.</p></div><figure class="customer-quote"><blockquote id="tasche-reference-title">&ldquo;WeldInspect Pro geeft ons veel meer overzicht in lasinspecties, projectdocumentatie en dossieropbouw. De werking sluit goed aan op onze praktijk in de staalbouw en de rapportage ziet er professioneel en verzorgd uit.&rdquo;</blockquote><figcaption>&mdash; Tasche Staalbouw</figcaption><a class="text-link" href="/case-studies/tasche-staalbouw">Bekijk de klantreferentie</a></figure></div></section>`;

const trustSectionEn = `<section class="section evaluation-confidence"><div class="container"><div class="section-head"><span class="kicker">Customer-backed evaluation</span><h2>Transparent product evaluation with a real steel construction reference.</h2><p>Review the product workflow, commercial routes and documentation context with the experience of Tasche Staalbouw as a practical reference.</p></div><div class="evaluation-grid"><article><h3>Customer reference</h3><p>Tasche Staalbouw uses WeldInspect Pro to organise weld inspections, project documentation and dossier preparation.</p></article><article><h3>Professional reporting</h3><p>Tasche Staalbouw describes the reporting as professional and well presented, without unsupported performance claims.</p></article><article><h3>Product workflow first</h3><p>Review projects, welds, inspections, WPS/WPQ context, evidence, documents and dossier preparation before choosing a paid route.</p></article><article><h3>Careful standards context</h3><p>Official standard texts, certification, qualified review and formal conformity decisions remain leading.</p></article></div></div></section>`;
const trustSectionNl = `<section class="section evaluation-confidence"><div class="container"><div class="section-head"><span class="kicker">Evalueren met praktijkreferentie</span><h2>Transparante productevaluatie met een echte referentie uit de staalbouw.</h2><p>Beoordeel het productwerkproces, de commerci&euml;le routes en documentatiecontext met de ervaring van Tasche Staalbouw als praktische referentie.</p></div><div class="evaluation-grid"><article><h3>Klantreferentie</h3><p>Tasche Staalbouw gebruikt WeldInspect Pro voor het organiseren van lasinspecties, projectdocumentatie en dossieropbouw.</p></article><article><h3>Professionele rapportage</h3><p>Tasche Staalbouw ervaart de rapportage als professioneel en verzorgd, zonder onbewezen prestatieclaims.</p></article><article><h3>Eerst het productwerkproces</h3><p>Bekijk projecten, lassen, inspecties, WPS/WPQ-context, bewijs, documenten en dossieropbouw voordat u een betaald traject kiest.</p></article><article><h3>Zorgvuldige normcontext</h3><p>Offici&euml;le normteksten, certificering, beoordeling door bevoegde personen en formele conformiteitsbesluiten blijven leidend.</p></article></div></div></section>`;

const realScreenSections = {
  'platform.html': ['Connected platform workflow', 'See live project status before opening the detail.', 'real-app-dashboard-clean.webp', 'WeldInspect Pro dashboard with project, weld and inspection status'],
  'inspections.html': ['Inspection context', 'Move from project overview to the records that need inspection follow-up.', 'real-app-projects-clean.webp', 'WeldInspect Pro project overview used for inspection follow-up'],
  'reports.html': ['Reporting and handover', 'Prepare report output and dossier handover from connected project records.', 'real-app-reports-clean.webp', 'WeldInspect Pro report preparation screen'],
  'demo.html': ['Demo environment', 'The guided walkthrough uses the same product environment shown here.', 'real-app-dashboard-clean.webp', 'Real WeldInspect Pro demo dashboard'],
  'trial.html': ['Trial evaluation', 'Evaluate projects, reports and organisation setup in a representative workflow.', 'real-app-projects-clean.webp', 'Real WeldInspect Pro project list for trial evaluation'],
  'pricing.html': ['Product context before payment', 'Review the product workflow before choosing monthly, yearly or custom follow-up.', 'real-app-billing-clean.webp', 'Real WeldInspect Pro billing and plan screen'],
  'nl/lasinspectie-software.html': ['Echt inspectieoverzicht', 'Bekijk projectstatus en inspectieopvolging in de echte demo-omgeving.', 'real-app-projects-clean.webp', 'Echt WeldInspect Pro projectoverzicht voor inspectieopvolging'],
  'nl/ce-dossier-software.html': ['Rapportage en overdracht', 'Bereid rapportage en dossieroverdracht voor vanuit verbonden projectrecords.', 'real-app-reports-clean.webp', 'Echt WeldInspect Pro rapportagescherm'],
  'nl/demo.html': ['Demo-omgeving', 'De begeleide productdoorloop gebruikt dezelfde omgeving die hier zichtbaar is.', 'real-app-dashboard-clean.webp', 'Echt WeldInspect Pro demo-dashboard'],
  'nl/trial.html': ['Proefperiode evalueren', 'Beoordeel projecten, rapportage en organisatie-inrichting in een representatief werkproces.', 'real-app-projects-clean.webp', 'Echt WeldInspect Pro projectoverzicht voor de proefperiode'],
  'nl/prijzen.html': ['Productcontext voor betaling', 'Bekijk het productwerkproces voordat u maand, jaar of maatwerk kiest.', 'real-app-billing-clean.webp', 'Echt WeldInspect Pro scherm voor abonnement en facturatie'],
};

function realScreenSection(kicker, heading, image, alt) {
  return `<section class="section real-screen-feature"><div class="container real-screen-feature-grid"><div><span class="kicker">${kicker}</span><h2>${heading}</h2><p>These screens are captured from the WeldInspect Pro demo environment and presented at a readable size for product evaluation.</p><a class="btn btn-outline" href="/demo">Request a guided walkthrough</a></div><a class="real-screen-frame" href="/assets/images/screenshots/${image}"><img src="/assets/images/screenshots/${image}" alt="${alt}" loading="lazy" decoding="async"></a></div></section>`;
}

function realScreenSectionNl(kicker, heading, image, alt) {
  return `<section class="section real-screen-feature"><div class="container real-screen-feature-grid"><div><span class="kicker">${kicker}</span><h2>${heading}</h2><p>Deze schermen komen uit de WeldInspect Pro demo-omgeving en worden op leesbaar formaat getoond voor productevaluatie.</p><a class="btn btn-outline" href="/nl/demo">Vraag een begeleide productdoorloop aan</a></div><a class="real-screen-frame" href="/assets/images/screenshots/${image}"><img src="/assets/images/screenshots/${image}" alt="${alt}" loading="lazy" decoding="async"></a></div></section>`;
}

const trialFaqEn = `<section class="section trial-complete"><div class="container"><div class="section-head"><span class="kicker">Trial scope</span><h2>Know exactly what you can evaluate.</h2><p>Trial access is confirmed after signup, based on the evaluation route and team context.</p></div><div class="evaluation-grid"><article><h3>Project structure</h3><p>Set up representative project context, roles and handover expectations.</p></article><article><h3>Weld and inspection records</h3><p>Review weld register structure, inspection status, findings and open actions.</p></article><article><h3>Evidence and documents</h3><p>Evaluate how photos, certificates, notes and supporting documents stay connected.</p></article><article><h3>Dossier and reporting flow</h3><p>Review dossier status, reporting preparation and the handover route.</p></article></div><div class="completion-faq"><article><h3>Do I need a credit card?</h3><p>No credit card is required to request trial access. Paid checkout is a separate route.</p></article><article><h3>How long does the trial last?</h3><p>Trial access is confirmed after signup, based on the evaluation route and team context.</p></article><article><h3>Can I book a demo first?</h3><p>Yes. Choose a demo for a guided walkthrough and trial for self-guided evaluation.</p></article><article><h3>What happens after signup?</h3><p>Your request is reviewed, access and evaluation focus are confirmed, and the suitable follow-up route is shared.</p></article><article><h3>Can multiple stakeholders join?</h3><p>Yes. Include QA/QC, welding coordination, project documentation or implementation stakeholders in the evaluation.</p></article></div></div></section>`;
const trialFaqNl = `<section class="section trial-complete"><div class="container"><div class="section-head"><span class="kicker">Inhoud proefperiode</span><h2>Weet vooraf wat u kunt beoordelen.</h2><p>Toegang tot de proefperiode wordt na aanvraag bevestigd, passend bij de evaluatieroute en teamsituatie.</p></div><div class="evaluation-grid"><article><h3>Projectstructuur</h3><p>Richt een representatieve projectcontext in met rollen en overdrachtsverwachtingen.</p></article><article><h3>Las- en inspectierecords</h3><p>Bekijk de structuur van het lasregister, inspectiestatus, bevindingen en open punten.</p></article><article><h3>Bewijs en documenten</h3><p>Beoordeel hoe foto&rsquo;s, certificaten, notities en ondersteunende documenten verbonden blijven.</p></article><article><h3>Dossier en rapportage</h3><p>Bekijk dossierstatus, rapportvoorbereiding en de route naar overdracht.</p></article></div><div class="completion-faq"><article><h3>Heb ik een creditcard nodig?</h3><p>Nee. Voor het aanvragen van proefperiodetoegang is geen creditcard nodig. Betalen is een aparte route.</p></article><article><h3>Hoe lang duurt de proefperiode?</h3><p>Toegang tot de proefperiode wordt na aanvraag bevestigd, passend bij de evaluatieroute en teamsituatie.</p></article><article><h3>Kan ik eerst een demo aanvragen?</h3><p>Ja. Kies een demo voor begeleiding en de proefperiode om zelf te verkennen.</p></article><article><h3>Wat gebeurt er na mijn aanvraag?</h3><p>De aanvraag wordt bekeken, toegang en evaluatiefocus worden bevestigd en u ontvangt een passende vervolgstap.</p></article><article><h3>Kunnen meerdere stakeholders meekijken?</h3><p>Ja. Betrek QA/QC, lasco&ouml;rdinatie, projectdocumentatie en implementatie bij de evaluatie.</p></article></div></div></section>`;

const pricingFaqAnswers = [
  ['Can I start with a trial?', 'Yes. Request trial access to evaluate project structure, weld and inspection records, evidence, dossier status and reporting before choosing a paid route.'],
  ['Do I need a credit card?', 'No credit card is needed for a trial or demo request. Mollie checkout is only used when you intentionally choose a paid plan.'],
  ['Can we add more users later?', 'Team size and rollout scope can be reviewed during commercial follow-up before or after initial evaluation.'],
  ['What happens after payment?', 'The checkout confirms amount, VAT and billing cycle before Mollie payment. Account and onboarding follow-up is then confirmed.'],
  ['Is implementation support available?', 'Implementation context can be discussed through demo or contact, especially for larger teams and multi-stakeholder workflows.'],
  ['Can we request a demo first?', 'Yes. A demo is the guided route for reviewing projects, welds, inspections, evidence, reporting and dossier preparation.'],
  ['What if our team needs a custom setup?', 'Use contact or demo to discuss team context, privacy/DPA review, implementation and commercial requirements.'],
];

const pricingTableEn = `<div class="scope-table"><table><thead><tr><th>Evaluation point</th><th>Trial evaluation</th><th>Monthly plan</th><th>Yearly plan</th><th>Enterprise / custom</th></tr></thead><tbody><tr><td>Product evaluation</td><td>Self-guided review</td><td>Paid use</td><td>Paid use</td><td>Guided scoping</td></tr><tr><td>Project and weld workflow</td><td>Review fit</td><td>Product route</td><td>Product route</td><td>Map rollout</td></tr><tr><td>Inspection documentation</td><td>Evaluate records</td><td>Product route</td><td>Product route</td><td>Discuss teams</td></tr><tr><td>Evidence and document context</td><td>Review flow</td><td>Product route</td><td>Product route</td><td>Map requirements</td></tr><tr><td>Reporting and handover workflow</td><td>Evaluate output</td><td>Product route</td><td>Product route</td><td>Discuss delivery</td></tr><tr><td>Team and implementation discussion</td><td>Available</td><td>Available</td><td>Available</td><td>Primary route</td></tr><tr><td>Commercial follow-up</td><td>After evaluation</td><td>Checkout follow-up</td><td>Checkout follow-up</td><td>Proposal route</td></tr><tr><td>Privacy and DPA review</td><td>Available</td><td>Available</td><td>Available</td><td>Included in scoping</td></tr></tbody></table></div>`;
const pricingTableNl = `<div class="scope-table"><table><thead><tr><th>Evaluatiepunt</th><th>Proefperiode</th><th>Maandplan</th><th>Jaarplan</th><th>Enterprise / maatwerk</th></tr></thead><tbody><tr><td>Productevaluatie</td><td>Zelf beoordelen</td><td>Betaald gebruik</td><td>Betaald gebruik</td><td>Begeleide afstemming</td></tr><tr><td>Project- en laswerkproces</td><td>Aansluiting beoordelen</td><td>Productroute</td><td>Productroute</td><td>Uitrol bespreken</td></tr><tr><td>Inspectiedocumentatie</td><td>Records beoordelen</td><td>Productroute</td><td>Productroute</td><td>Teams bespreken</td></tr><tr><td>Bewijs- en documentcontext</td><td>Werkproces beoordelen</td><td>Productroute</td><td>Productroute</td><td>Eisen afstemmen</td></tr><tr><td>Rapportage en overdracht</td><td>Uitvoer beoordelen</td><td>Productroute</td><td>Productroute</td><td>Oplevering bespreken</td></tr><tr><td>Team- en implementatiegesprek</td><td>Beschikbaar</td><td>Beschikbaar</td><td>Beschikbaar</td><td>Primaire route</td></tr><tr><td>Commerci&euml;le opvolging</td><td>Na evaluatie</td><td>Na checkout</td><td>Na checkout</td><td>Voorstel op maat</td></tr><tr><td>Privacy- en DPA-beoordeling</td><td>Beschikbaar</td><td>Beschikbaar</td><td>Beschikbaar</td><td>Onderdeel van afstemming</td></tr></tbody></table></div>`;

function replacePricingPlaceholder(html, dutch = false) {
  if (dutch) {
    return html.replace(/<p>Dit wordt beantwoord met praktische context[^<]*<\/p>/g, '<p>Bekijk proefperiode, demo en betaalroute naast elkaar en kies de vervolgstap die past bij uw team.</p>');
  }
  let index = 0;
  return html.replace(/<p>This is answered with practical context and without unsupported claims\.<\/p>/g, () => {
    const answer = pricingFaqAnswers[index]?.[1] || 'Contact WeldInspect Pro for a clear answer based on your team and evaluation route.';
    index += 1;
    return `<p>${answer}</p>`;
  });
}

const mojibake = new Map([
  ['\u00e2\u20ac\u2122', '&rsquo;'],
  ['\u00e2\u20ac\u0153', '&ldquo;'],
  ['\u00e2\u20ac\u009d', '&rdquo;'],
  ['\u00e2\u20ac\u201c', '&mdash;'],
  ['\u00c3\u00ab', '&euml;'],
  ['\u00c3\u00a9', '&eacute;'],
  ['\u00c3\u00af', '&iuml;'],
  ['\u00c3\u00b3', '&oacute;'],
  ['\u00c3\u00b6', '&ouml;'],
  ['\u00c3\u00a8', '&egrave;'],
  ['\u00c3\u00ab', '&euml;'],
  ['\u00c2\u00b7', '&middot;'],
  ['foto?s', 'foto&rsquo;s'],
  ['Kan ik eerst de werkproces zien?', 'Kan ik eerst het werkproces zien?'],
]);

function repairEncoding(html) {
  for (const [bad, good] of mojibake) html = html.split(bad).join(good);
  return html
    .replaceAll('commerciÃ«le', 'commerci&euml;le')
    .replaceAll('vÃ³Ã³r', 'v&oacute;&oacute;r')
    .replaceAll('OfficiÃ«le', 'Offici&euml;le')
    .replaceAll('coÃ¶rdinatie', 'co&ouml;rdinatie');
}

function replaceTrust(html, dutch) {
  const regex = /<!-- final-trust:start --><section class="section evaluation-confidence">[\s\S]*?<\/section><!-- final-trust:end -->/;
  if (!regex.test(html)) return html;
  return html.replace(regex, `<!-- final-trust:start -->${dutch ? trustSectionNl : trustSectionEn}<!-- final-trust:end -->`);
}

const articleExpansionEn = (title) => `<section class="article-depth"><h2>How to apply ${title.toLowerCase()} in a live project</h2><p>Start with a representative project and define which records must remain connected from preparation through delivery. Assign ownership for the weld register, inspection records, supporting evidence and report review. This prevents documentation from becoming a separate end-of-project activity and gives coordinators a clearer view of missing information while work is still accessible.</p><p>Use a consistent record structure for weld numbers, locations, procedure references, inspection status and open actions. Photos and documents should be attached to the record they support, with enough context for another team member to understand why the evidence matters. A clear status model helps distinguish work that is prepared, inspected, awaiting review or ready for handover.</p><h2>Review points for QA/QC and welding coordination</h2><p>QA/QC teams should regularly review incomplete records, unresolved findings and evidence that is not yet connected to a project or weld. Welding coordination can use the same review moment to check WPS/WPQ context and whether the current documentation reflects the work being performed. The goal is not to replace qualified judgement, but to make the information needed for that judgement easier to find.</p><ul><li>Confirm project scope and responsibilities before registration starts.</li><li>Use stable weld identifiers across drawings, inspections and evidence.</li><li>Record findings and open actions while the work is visible.</li><li>Review report and dossier status before delivery pressure increases.</li></ul><h2>From records to handover</h2><p>Before handover, review whether project records, inspection outcomes, photos, certificates and reports tell one coherent story. Missing evidence should be visible as an action rather than discovered during final assembly. WeldInspect Pro supports this documentation workflow; official standards, certification, qualified review and formal conformity decisions remain leading.</p></section>`;
const articleExpansionNl = (title) => `<section class="article-depth"><h2>${title}: toepassen in een lopend project</h2><p>Begin met een representatief project en bepaal welke gegevens vanaf voorbereiding tot oplevering met elkaar verbonden moeten blijven. Wijs eigenaarschap toe voor het lasregister, inspectierecords, bewijsstukken en rapportcontrole. Zo wordt documentatie geen losse eindactiviteit en ziet het team eerder welke informatie nog ontbreekt.</p><p>Gebruik een vaste structuur voor lasnummers, locaties, procedureverwijzingen, inspectiestatus en open punten. Koppel foto&rsquo;s en documenten aan het record dat zij ondersteunen, met voldoende context voor een collega die het werk later beoordeelt. Een duidelijke status maakt onderscheid tussen voorbereid, ge&iuml;nspecteerd, in beoordeling en gereed voor overdracht.</p><h2>Controlepunten voor QA/QC en lasco&ouml;rdinatie</h2><p>QA/QC kan periodiek controleren op onvolledige records, openstaande bevindingen en bewijs dat nog niet aan een project of las is gekoppeld. Lasco&ouml;rdinatie kan tijdens hetzelfde controlemoment de WPS/WPQ-context en aansluiting op de uitvoering beoordelen. Het systeem vervangt geen vakinhoudelijk oordeel, maar maakt de benodigde informatie beter vindbaar.</p><ul><li>Bevestig projectscope en verantwoordelijkheden voordat registratie start.</li><li>Gebruik vaste lasnummers in tekeningen, inspecties en bewijs.</li><li>Leg bevindingen en open punten vast terwijl het werk zichtbaar is.</li><li>Controleer rapport- en dossierstatus voordat de opleverdruk oploopt.</li></ul><h2>Van projectrecord naar overdracht</h2><p>Controleer voor oplevering of projectrecords, inspectieresultaten, foto&rsquo;s, certificaten en rapporten samen een logisch geheel vormen. Ontbrekend bewijs hoort als open actie zichtbaar te zijn en niet pas tijdens de laatste dossiersamenstelling naar voren te komen. WeldInspect Pro ondersteunt dit werkproces; offici&euml;le normteksten, certificering, beoordeling door bevoegde personen en formele conformiteitsbesluiten blijven leidend.</p></section>`;
const articleReviewEn = `<section class="article-review"><h2>A practical review rhythm</h2><p>Schedule a short documentation review at meaningful project moments: after project setup, before inspection starts, after significant findings and before handover. Review the same questions each time. Are identifiers consistent? Are responsibilities clear? Is evidence attached to the correct record? Are unresolved actions visible to the person who owns them? This repeatable rhythm reduces reliance on memory and gives project, QA/QC and documentation teams a shared view of progress.</p><p>Use the final review to confirm that the report output can be understood without reconstructing conversations from email or separate folders. Record any remaining gap as an owned action with context and status. This makes the handover conversation more precise while leaving formal technical decisions with the qualified people responsible for them.</p></section>`;
const articleReviewNl = `<section class="article-review"><h2>Een praktisch controleritme</h2><p>Plan een korte documentatiecontrole op logische projectmomenten: na projectinrichting, voor de start van inspecties, na belangrijke bevindingen en voor overdracht. Stel telkens dezelfde vragen. Zijn identificaties consequent? Zijn verantwoordelijkheden duidelijk? Is bewijs aan het juiste record gekoppeld? Zijn open acties zichtbaar voor de eigenaar? Dit vaste ritme vermindert afhankelijkheid van geheugen en geeft projectteam, QA/QC en documentatie een gedeeld beeld van de voortgang.</p><p>Gebruik de laatste controle om te bevestigen dat rapportage begrijpelijk is zonder gesprekken uit e-mail of losse mappen te reconstrueren. Leg ieder resterend gat vast als een actie met eigenaar, context en status. Zo wordt de overdracht concreter, terwijl formele technische besluiten bij de bevoegde personen blijven.</p></section>`;

for (const file of walk()) {
  const relativePath = relative(root, file).replaceAll('\\', '/');
  let html = readFileSync(file, 'utf8');
  const dutch = relativePath.startsWith('nl/');
  html = html
    .replace(legacyTascheLogoLarge, tascheLogoLarge)
    .replace(legacyTascheLogo, tascheLogo);
  html = repairEncoding(html);
  html = replaceTrust(html, dutch);
  html = replacePricingPlaceholder(html, dutch);
  writeFileSync(file, html, 'utf8');
}

for (const [path, config] of Object.entries(realScreenSections)) {
  let html = read(path);
  const dutch = path.startsWith('nl/');
  const section = dutch ? realScreenSectionNl(...config) : realScreenSection(...config);
  html = insertBeforeTrustOrCta(html, section);
  write(path, html);
}

for (const path of ['index.html', 'pricing.html', 'demo.html', 'trial.html', 'case-studies.html']) {
  let html = read(path);
  html = insertBeforeTrustOrCta(html, trustEn);
  write(path, html);
}
for (const path of ['nl/index.html', 'nl/prijzen.html', 'nl/demo.html', 'nl/trial.html']) {
  let html = read(path);
  html = insertBeforeTrustOrCta(html, trustNl);
  write(path, html);
}

for (const [path, section] of [['trial.html', trialFaqEn], ['nl/trial.html', trialFaqNl]]) {
  let html = read(path);
  html = insertBeforeTrustOrCta(html, section);
  write(path, html);
}

for (const [path, table] of [['pricing.html', pricingTableEn], ['nl/prijzen.html', pricingTableNl]]) {
  let html = read(path);
  html = html.replace(/<div class="scope-table"><table>[\s\S]*?<\/table><\/div>/, table);
  write(path, html);
}

const organizationSchema = `<script type="application/ld+json">[{"@context":"https://schema.org","@type":"Organization","name":"WeldInspect Pro","url":"https://weldinspectpro.com/","email":"info@weldinspectpro.com"},{"@context":"https://schema.org","@type":"WebSite","name":"WeldInspect Pro","url":"https://weldinspectpro.com/"},{"@context":"https://schema.org","@type":"SoftwareApplication","name":"WeldInspect Pro","applicationCategory":"BusinessApplication","operatingSystem":"Web","url":"https://weldinspectpro.com/","description":"Weld inspection and documentation software for projects, welds, inspections, WPS/WPQ context, evidence, reporting and CE dossier preparation."}]</script>`;
for (const path of ['index.html', 'nl/index.html']) {
  let html = read(path);
  if (!html.includes('"@type":"Organization"')) html = html.replace('</head>', `${organizationSchema}</head>`);
  write(path, html);
}

const faqSchemas = {
  'trial.html': [
    ['Do I need a credit card?', 'No credit card is required to request trial access. Paid checkout is a separate route.'],
    ['How long does the trial last?', 'Trial access is confirmed after signup, based on the evaluation route and team context.'],
    ['Can I book a demo first?', 'Yes. Choose a demo for a guided walkthrough and trial for self-guided evaluation.'],
  ],
  'demo.html': [
    ['What can we review in the demo?', 'Project setup, weld register, inspection records, WPS/WPQ context, evidence, dossier status and reporting.'],
    ['Can multiple stakeholders join?', 'Yes. QA/QC, welding coordination, documentation and implementation stakeholders can join.'],
  ],
  'nl/trial.html': [
    ['Heb ik een creditcard nodig?', 'Nee. Voor het aanvragen van proefperiodetoegang is geen creditcard nodig.'],
    ['Hoe lang duurt de proefperiode?', 'Toegang wordt na aanvraag bevestigd, passend bij de evaluatieroute en teamsituatie.'],
    ['Kan ik eerst een demo aanvragen?', 'Ja. Kies een demo voor begeleiding en de proefperiode om zelf te verkennen.'],
  ],
  'nl/demo.html': [
    ['Wat kunnen we in de demo bekijken?', 'Projectinrichting, lasregister, inspectierecords, WPS/WPQ-context, bewijs, dossierstatus en rapportage.'],
    ['Kunnen meerdere stakeholders deelnemen?', 'Ja. QA/QC, lascoordinatie, documentatie en implementatie kunnen deelnemen.'],
  ],
};
for (const [path, questions] of Object.entries(faqSchemas)) {
  let html = read(path);
  if (!html.includes('"@type":"FAQPage"')) {
    const schema = `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: questions.map(([name, text]) => ({
        '@type': 'Question',
        name,
        acceptedAnswer: { '@type': 'Answer', text },
      })),
    })}</script>`;
    html = html.replace('</head>', `${schema}</head>`);
  }
  write(path, html);
}

for (const folder of ['resources', 'nl/blog']) {
  for (const entry of readdirSync(join(root, folder))) {
    if (!entry.endsWith('.html') || entry === 'index.html') continue;
    const path = `${folder}/${entry}`;
    let html = read(path);
    if (html.includes('class="article-depth"')) {
      if (!html.includes('class="article-review"')) {
        html = insertBefore(html, '<section class="final-cta', folder === 'resources' ? articleReviewEn : articleReviewNl);
        write(path, html);
      }
      write(`${folder}/${entry.replace(/\.html$/, '')}/index.html`, html);
      continue;
    }
    const title = html.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '') || entry.replace('.html', '').replaceAll('-', ' ');
    const expansion = folder === 'resources' ? articleExpansionEn(title) : articleExpansionNl(title);
    html = insertBefore(html, '<section class="final-cta', expansion);
    html = insertBefore(html, '<section class="final-cta', folder === 'resources' ? articleReviewEn : articleReviewNl);
    write(path, html);
    write(`${folder}/${entry.replace(/\.html$/, '')}/index.html`, html);
  }
}

const caseSource = read('case-studies.html');
const beforeMain = caseSource.slice(0, caseSource.indexOf('<main>'))
  .replace(/<title>[\s\S]*?<\/title>/, '<title>Tasche Staalbouw customer reference | WeldInspect Pro</title>')
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="How Tasche Staalbouw uses WeldInspect Pro for weld inspection overview, project documentation, dossier preparation and professional reporting.">')
  .replace(/<link rel="canonical" href="[^"]+">/, '<link rel="canonical" href="https://weldinspectpro.com/case-studies/tasche-staalbouw">');
const afterMain = caseSource.slice(caseSource.indexOf('</main>') + 7);
const caseMain = `<main><section class="route-hero customer-case-hero"><div class="container route-hero-grid"><div><p class="kicker">Customer reference</p><h1>Tasche Staalbouw keeps weld inspection and dossier work connected.</h1><p class="lead">A practical steel construction reference focused on overview, project documentation, dossier preparation and professional reporting.</p><div class="hero-actions"><a class="btn btn-primary btn-large" href="/demo">Book a demo</a><a class="btn btn-outline btn-large" href="/trial">Start trial evaluation</a></div></div>${tascheLogoLarge}</div></section>${trustEn}<section class="section"><div class="container case-detail-grid"><article><span class="kicker">Context</span><h2>Steel construction needs project information to stay findable.</h2><p>Tasche Staalbouw works with WeldInspect Pro to organise weld inspections, project documentation and dossier preparation. The reference is intentionally based on confirmed experience rather than invented project details or performance figures.</p></article><article><span class="kicker">Experience</span><h2>More overview across inspection and documentation work.</h2><p>The platform fits the practical steel construction context and helps keep project information, inspection records, evidence and reporting closer together.</p></article><article><span class="kicker">Reporting</span><h2>Professional and well-presented output.</h2><p>Tasche Staalbouw is very satisfied with the operation of WeldInspect Pro and describes the reporting as professional and well presented.</p></article></div></section><section class="section real-screen-feature"><div class="container real-screen-feature-grid"><div><span class="kicker">Product context</span><h2>From project overview to reporting.</h2><p>The product environment supports the connected route from project records and inspection follow-up to report preparation.</p><a class="btn btn-outline" href="/demo">See the workflow in a demo</a></div><a class="real-screen-frame" href="/assets/images/screenshots/real-app-reports-clean.webp"><img src="/assets/images/screenshots/real-app-reports-clean.webp" alt="WeldInspect Pro report preparation screen" loading="lazy" decoding="async"></a></div></section><section class="claim-safe-strip"><div class="container">WeldInspect Pro supports documentation workflows around relevant standards. Official standard texts, certification, qualified review and formal conformity decisions remain leading.</div></section></main>`;
const caseSchema = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"Tasche Staalbouw customer reference","description":"How Tasche Staalbouw uses WeldInspect Pro for weld inspection overview, project documentation, dossier preparation and professional reporting.","author":{"@type":"Organization","name":"WeldInspect Pro"},"publisher":{"@type":"Organization","name":"WeldInspect Pro"},"mainEntityOfPage":"https://weldinspectpro.com/case-studies/tasche-staalbouw"}</script>`;
write('case-studies/tasche-staalbouw.html', `${beforeMain.replace('</head>', `${caseSchema}</head>`)}${caseMain}${afterMain}`);
write('case-studies/tasche-staalbouw/index.html', `${beforeMain.replace('</head>', `${caseSchema}</head>`)}${caseMain}${afterMain}`);

const canonicalGroups = new Map();
for (const file of walk()) {
  const html = readFileSync(file, 'utf8');
  const canonical = html.match(/<link rel="canonical" href="(https:\/\/weldinspectpro\.com[^"]+)">/)?.[1];
  if (!canonical) continue;
  if (!canonicalGroups.has(canonical)) canonicalGroups.set(canonical, []);
  canonicalGroups.get(canonical).push(file);
}

const titleCounts = new Map();
const descriptionCounts = new Map();
for (const [, files] of canonicalGroups) {
  const html = readFileSync(files[0], 'utf8');
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta name="description" content="([^"]*)">/i)?.[1]?.trim();
  if (title) titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
  if (description) descriptionCounts.set(description, (descriptionCounts.get(description) || 0) + 1);
}

const usedTitles = new Map();
const usedDescriptions = new Map();
for (const [canonical, files] of [...canonicalGroups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  let html = readFileSync(files[0], 'utf8');
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
    ?.replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const pathname = new URL(canonical).pathname;
  const dutch = pathname.startsWith('/nl/');
  let title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  let description = html.match(/<meta name="description" content="([^"]*)">/i)?.[1]?.trim();

  if (title && titleCounts.get(title) > 1) {
    const routeLabel = pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' ') || 'WeldInspect Pro';
    title = `${h1 || routeLabel} | WeldInspect Pro`;
    if (usedTitles.has(title)) title = `${h1 || routeLabel} - ${routeLabel} | WeldInspect Pro`;
  }
  if (description && descriptionCounts.get(description) > 1) {
    const routeLabel = pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' ') || 'WeldInspect Pro';
    description = dutch
      ? `${h1 || routeLabel}. Praktische uitleg over ${routeLabel}, lasinspectie, projectdocumentatie, bewijs, dossieropbouw en overdracht met WeldInspect Pro.`
      : `${h1 || routeLabel}. Practical guidance for ${routeLabel}, weld inspection, project documentation, evidence, dossier preparation and handover with WeldInspect Pro.`;
  }

  if (title) usedTitles.set(title, canonical);
  if (description) usedDescriptions.set(description, canonical);
  for (const file of files) {
    let page = readFileSync(file, 'utf8');
    if (title) page = page.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
    if (description) page = page.replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${description}">`);
    writeFileSync(file, page, 'utf8');
  }
}

console.log('Applied final customer proof, product, conversion, Dutch and article completion.');
