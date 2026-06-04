import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const base = 'https://weldinspectpro.com';
const lastmod = '2026-06-04';

const safeClaimEn = 'WeldInspect Pro supports documentation workflows around relevant standards. Official standard texts, certification, qualified review and formal conformity decisions remain leading.';
const safeClaimNl = 'WeldInspect Pro ondersteunt werkprocessen en documentatie rondom relevante normen. Offici&euml;le normteksten, certificering, beoordeling door bevoegde personen en formele conformiteitsbesluiten blijven leidend.';

const coreEn = ['/', '/platform', '/inspections', '/reports', '/pricing', '/demo', '/trial', '/contact', '/standards', '/resources', '/security', '/use-cases', '/case-studies', '/privacy', '/terms', '/legal', '/dpa', '/acceptable-use', '/billing-refund-policy', '/service-availability', '/en-1090', '/iso-3834', '/iso-5817', '/iso-15609', '/iso-9606-1', '/en-10204'];
const coreNl = ['/nl/', '/nl/lasinspectie-software', '/nl/en-1090-software', '/nl/ce-dossier-software', '/nl/prijzen', '/nl/demo', '/nl/trial', '/nl/contact', '/nl/blog/', '/nl/digitale-lasinspectie', '/nl/ce-dossier-checklist', '/nl/wps-wpq-beheer', '/nl/materiaaltraceerbaarheid-staalbouw', '/nl/lasinspectie-fotos', '/nl/en-1090-documentatie'];

const alternatePairs = new Map([
  ['/', ['/nl/', '/']],
  ['/platform', ['/nl/lasinspectie-software', '/platform']],
  ['/inspections', ['/nl/lasinspectie-software', '/inspections']],
  ['/reports', ['/nl/ce-dossier-software', '/reports']],
  ['/pricing', ['/nl/prijzen', '/pricing']],
  ['/demo', ['/nl/demo', '/demo']],
  ['/trial', ['/nl/trial', '/trial']],
  ['/contact', ['/nl/contact', '/contact']],
  ['/standards', ['/nl/en-1090-software', '/standards']],
  ['/resources', ['/nl/blog/', '/resources']],
  ['/wps-wpq-documentation-software', ['/nl/wps-wpq-documentatie', '/wps-wpq-documentation-software']],
  ['/material-traceability-software', ['/nl/materiaaltraceerbaarheid', '/material-traceability-software']],
  ['/ce-dossier-software', ['/nl/ce-dossier-software', '/ce-dossier-software']],
  ['/weld-inspection-report-software', ['/nl/lasinspectie-rapportage', '/weld-inspection-report-software']],
  ['/qa-qc-software-welding', ['/nl/kwaliteitscontrole-staalbouw', '/qa-qc-software-welding']],
  ['/steel-construction-documentation-software', ['/nl/projectdocumentatie-staalbouw', '/steel-construction-documentation-software']],
]);

for (const [enRoute, [nlRoute, fallbackRoute]] of [...alternatePairs]) {
  alternatePairs.set(nlRoute, [nlRoute, fallbackRoute || enRoute]);
}

const enLanding = [
  {
    route: '/wps-wpq-documentation-software',
    title: 'WPS/WPQ Documentation Software | WeldInspect Pro',
    description: 'Connect WPS/WPQ context, weld records and project documentation in one structured workflow for welding and steel construction teams.',
    h1: 'WPS/WPQ documentation software for welding projects.',
    kicker: 'WPS/WPQ documentation',
    intro: 'Keep procedure and qualification context close to the weld records, inspection notes and project documents that need it.',
    image: '/assets/images/marketing/optimized/report-preview.jpg',
    sections: [
      ['Why WPS/WPQ context gets lost in project work', 'Procedure references often sit in folders, spreadsheets or shared drives while weld records and inspection results move somewhere else. WeldInspect Pro helps teams keep that context visible during project execution.'],
      ['Connect procedures, welds and evidence', 'Use one structured view for WPS/WPQ references, weld identifiers, evidence, inspection status and document handover preparation.'],
      ['What teams can organise', 'Teams can group procedure references, welder qualification context, inspection evidence, certificates and review notes around the same project record.'],
      ['Workflow: prepare, link, inspect, review and handover', 'Prepare the project, link relevant procedure context, record inspection work, review open items and keep handover information findable.'],
      ['Safe standards context', safeClaimEn],
    ],
    faq: [
      ['Does WeldInspect Pro approve WPS or WPQ documents?', 'No. It supports documentation workflows and visibility. Qualified review, certification and official standard texts remain leading.'],
      ['Can WPS/WPQ references be connected to weld records?', 'Yes. The platform is designed to keep procedure and qualification context near weld, inspection and evidence records.'],
      ['Who uses this page?', 'Welding coordinators, QA/QC managers and documentation teams that need clearer project context.'],
    ],
    links: ['/standards', '/resources/wps-vs-wpq-explained', '/resources/combining-wps-inspections-and-ce-dossier', '/demo'],
  },
  {
    route: '/material-traceability-software',
    title: 'Material Traceability Software | WeldInspect Pro',
    description: 'Organise material certificates, heat numbers and project evidence in connected documentation workflows for steel construction projects.',
    h1: 'Material traceability software for steel construction teams.',
    kicker: 'Material traceability',
    intro: 'Connect material certificates, heat numbers, batch context and project records so evidence is easier to find during review and handover.',
    image: '/assets/images/marketing/optimized/mobile-inspection.jpg',
    sections: [
      ['Why material traceability matters', 'Material evidence often becomes hard to follow when certificates, batches, welds and project records are managed in separate locations.'],
      ['Link certificates, batches and project records', 'Keep certificate references, heat numbers and batch details connected with project documentation and relevant weld or inspection records.'],
      ['From material document to dossier evidence', 'Use material records as part of a wider dossier workflow instead of searching for certificates at the end of the project.'],
      ['Use cases for QA/QC and documentation teams', 'QA/QC teams can see what evidence is linked, what still needs attention and what should be prepared before handover.'],
      ['Safe standards context', safeClaimEn],
    ],
    faq: [
      ['Can WeldInspect Pro store material certificate context?', 'It supports document and evidence workflows for material traceability. Formal review remains the responsibility of qualified personnel.'],
      ['Can heat numbers be used in project documentation?', 'Yes. Heat numbers and batch references can be kept visible alongside project records.'],
      ['Is this only for EN 1090 projects?', 'The platform is focused on welding and steel construction documentation workflows around relevant standards.'],
    ],
    links: ['/en-10204', '/resources/material-traceability-explained', '/reports', '/contact'],
  },
  {
    route: '/ce-dossier-software',
    title: 'CE Dossier Software | WeldInspect Pro',
    description: 'Build CE dossier structure during project execution with connected inspection evidence, WPS/WPQ context, material records and reports.',
    h1: 'CE dossier software for EN 1090 project documentation.',
    kicker: 'CE dossier workflow',
    intro: 'Prepare dossier structure while the project is moving, with inspection evidence, WPS/WPQ context, material records and reporting in one connected flow.',
    image: '/assets/images/marketing/optimized/report-preview.jpg',
    sections: [
      ['Build dossier structure during execution', 'Dossier preparation is easier when evidence is linked as work happens instead of being collected under delivery pressure.'],
      ['What belongs around a CE dossier workflow', 'Project scope, inspection records, WPS/WPQ references, material evidence, documents and report output all need clear context.'],
      ['Evidence, inspections, WPS/WPQ and materials', 'WeldInspect Pro helps teams keep evidence connected so review and handover discussions are calmer and better prepared.'],
      ['Handover readiness', 'Use dossier status and open action views to see what is ready and what needs follow-up before delivery.'],
      ['Safe standards context', safeClaimEn],
    ],
    faq: [
      ['Does WeldInspect Pro certify CE dossiers?', 'No. It supports documentation workflows. Official standard texts, certification and formal conformity decisions remain leading.'],
      ['Can evidence be linked before handover?', 'Yes. The product is built around linking evidence during execution.'],
      ['Who benefits from CE dossier software?', 'QA/QC teams, documentation teams, welding coordinators and project managers.'],
    ],
    links: ['/reports', '/standards', '/resources/what-is-a-ce-dossier', '/trial'],
  },
  {
    route: '/weld-inspection-report-software',
    title: 'Weld Inspection Report Software | WeldInspect Pro',
    description: 'Capture weld inspection records, photos, findings and open actions in connected reporting workflows for project handover.',
    h1: 'Weld inspection report software.',
    kicker: 'Inspection reporting',
    intro: 'Capture inspection findings while context is fresh and keep photos, actions and report-ready records tied to the right weld or project.',
    image: '/assets/images/marketing/optimized/photo-inspector-tablet.jpg',
    sections: [
      ['Capture inspection records while context is fresh', 'Field notes, visual inspection results and status updates are most useful when they are recorded close to the work.'],
      ['Link findings to welds and evidence', 'Attach findings, photos and follow-up notes to the relevant weld or project context.'],
      ['Prepare report-ready project records', 'Structured inspection records make reporting and handover preparation less dependent on manual document chasing.'],
      ['Review open actions before handover', 'Use open action views to see what needs review, closure or explanation before delivery.'],
      ['Safe standards context', safeClaimEn],
    ],
    faq: [
      ['Can photos be linked to inspection records?', 'Yes. Photos and findings can stay connected to weld and project records.'],
      ['Does this replace qualified inspection?', 'No. It supports recording and documentation. Qualified personnel remain responsible for formal decisions.'],
      ['Can reports be prepared during execution?', 'Yes. Report preparation can start from structured records already captured during work.'],
    ],
    links: ['/inspections', '/resources/digital-weld-inspection-records', '/resources/linking-inspection-photos-to-weld-records', '/demo'],
  },
  {
    route: '/qa-qc-software-welding',
    title: 'QA/QC Software for Welding | WeldInspect Pro',
    description: 'Manage welding QA/QC workflows, open actions, inspection evidence and project documentation in one connected platform.',
    h1: 'QA/QC software for welding and steel construction teams.',
    kicker: 'QA/QC workflow',
    intro: 'Give quality teams a clearer view of open points, inspection status, responsibilities and documentation progress.',
    image: '/assets/images/marketing/optimized/inspectors-onsite.jpg',
    sections: [
      ['QA/QC without disconnected spreadsheets', 'Quality work becomes harder when actions, evidence and responsibilities are spread across separate files.'],
      ['Open actions and review context', 'Keep findings, owners, status and evidence close together so reviews can focus on the work rather than searching.'],
      ['Roles, responsibilities and project visibility', 'Project managers, coordinators and QA/QC teams can work from the same project context.'],
      ['Documentation workflows around standards', 'Use structured records to support documentation around standards without replacing formal decisions.'],
      ['Safe standards context', safeClaimEn],
    ],
    faq: [
      ['Can open actions be tracked?', 'Yes. Open actions can be connected with findings, evidence and project context.'],
      ['Is this built for welding teams?', 'Yes. The platform focuses on welding, steel construction, inspection and documentation workflows.'],
      ['Does WeldInspect Pro make compliance decisions?', 'No. It supports documentation workflows; formal decisions remain leading.'],
    ],
    links: ['/inspections', '/steel-construction-documentation-software', '/resources/open-actions-in-qa-qc', '/contact'],
  },
  {
    route: '/steel-construction-documentation-software',
    title: 'Steel Construction Documentation Software | WeldInspect Pro',
    description: 'Connect project documentation, weld records, inspections, material evidence and handover preparation for steel construction teams.',
    h1: 'Steel construction documentation software.',
    kicker: 'Project documentation',
    intro: 'Keep project records, welds, inspections, material evidence and handover documents connected through the project lifecycle.',
    image: '/assets/images/marketing/optimized/hero-welder-action.jpg',
    sections: [
      ['Documentation across the project lifecycle', 'Documentation work starts at project setup and continues through production, inspection, review and handover.'],
      ['Connect project records, welds, inspections and files', 'WeldInspect Pro helps teams link records and evidence so important context does not disappear into folders.'],
      ['Prepare handover earlier', 'Structured project information helps teams spot missing records before the end of the job.'],
      ['Use cases', 'Steel fabricators, QA/QC managers, welding coordinators and documentation teams can use shared project context.'],
      ['Safe standards context', safeClaimEn],
    ],
    faq: [
      ['What documentation can be organised?', 'Project records, weld context, inspections, evidence, material documents and handover output can be organised in connected workflows.'],
      ['Can this support steel construction teams?', 'Yes. The messaging and workflows are built around welding and steel construction documentation.'],
      ['Does this replace official documentation requirements?', 'No. Official texts, certification and qualified review remain leading.'],
    ],
    links: ['/platform', '/material-traceability-software', '/qa-qc-software-welding', '/trial'],
  },
];

const nlLanding = [
  ['nl/digitale-lasinspectie', 'Digitale lasinspectie vastleggen | WeldInspect Pro', 'Leg lasinspecties digitaal vast, koppel foto&rsquo;s en bevindingen en volg open punten op binnen een duidelijk werkproces.', 'Digitale lasinspectie vastleggen.', 'Digitale inspectie', ['Inspecties digitaal registreren', 'Leg visuele controles, bevindingen en statusupdates vast terwijl de projectcontext nog helder is.'], ['Foto&rsquo;s en bevindingen koppelen', 'Koppel inspectiefoto&rsquo;s, notities en open punten aan de juiste las of projectrecord.'], ['QA/QC-review ondersteunen', 'Maak zichtbaar welke bevindingen openstaan en welke acties eerst aandacht nodig hebben.']],
  ['nl/lasinspectie-rapportage', 'Lasinspectierapportage software | WeldInspect Pro', 'Maak inspectieresultaten, bewijs, open acties en overdracht overzichtelijker met software voor lasinspectierapportage.', 'Lasinspectierapportage software.', 'Rapportage', ['Inspectieresultaten structureren', 'Gebruik inspectierecords als basis voor rapportage in plaats van losse notities.'], ['Bewijs en rapportage verbinden', 'Foto&rsquo;s, bevindingen en documenten blijven gekoppeld aan de juiste projectcontext.'], ['Overdracht voorbereiden', 'Open acties en rapportagepunten zijn eerder zichtbaar voor review.']],
  ['nl/wps-wpq-documentatie', 'WPS/WPQ-documentatie koppelen | WeldInspect Pro', 'Koppel WPS/WPQ-context, lasrecords en projectdocumentatie overzichtelijk binnen een werkproces voor staalbouwteams.', 'WPS/WPQ-documentatie overzichtelijk koppelen.', 'WPS/WPQ', ['Procedurecontext zichtbaar houden', 'Houd WPS/WPQ-verwijzingen dicht bij lassen, inspecties en projectdocumenten.'], ['Lasserskwalificaties in context', 'Maak kwalificatiecontext vindbaar zonder formele beoordeling te vervangen.'], ['Veilige normcontext', safeClaimNl]],
  ['nl/materiaaltraceerbaarheid', 'Materiaaltraceerbaarheid staalbouw | WeldInspect Pro', 'Beheer materiaalcertificaten, heat numbers en projectbewijs overzichtelijk binnen documentatieworkflows voor staalbouwprojecten.', 'Materiaaltraceerbaarheid in staalbouwprojecten.', 'Traceerbaarheid', ['Materiaalcertificaten vindbaar houden', 'Koppel certificaten en materiaalbewijs aan projectrecords.'], ['Heat numbers en batchinformatie', 'Bewaar heat numbers en batchcontext naast relevante documenten en bewijs.'], ['Dossiercontext versterken', 'Materiaalbewijs wordt onderdeel van de bredere overdracht.']],
  ['nl/en-1090-documentatie', 'EN 1090-documentatie organiseren | WeldInspect Pro', 'Organiseer EN 1090-documentatie met inspecties, materiaalbewijs, WPS/WPQ-context en CE-dossieropbouw in een duidelijk werkproces.', 'EN 1090-documentatie organiseren.', 'EN 1090', ['Projectdocumentatie verbinden', 'Projecten, lassen, inspecties en documenten blijven in dezelfde context zichtbaar.'], ['Bewijsstukken beter voorbereiden', 'Bewijs, certificaten en rapportagepunten zijn eerder beschikbaar voor review.'], ['Veilige normclaim', safeClaimNl]],
  ['nl/ce-dossier-checklist', 'CE-dossier checklist staalbouw | WeldInspect Pro', 'Gebruik een praktische CE-dossier checklist voor structuur rond bewijs, documenten, inspecties en overdracht in staalbouwprojecten.', 'CE-dossier checklist voor staalbouwprojecten.', 'CE-dossier', ['Checklist zonder normtekst te kopieren', 'Gebruik praktische categorie&euml;n voor structuur, zonder offici&euml;le normteksten te vervangen.'], ['Dossiergereedheid volgen', 'Zie welke projectinformatie, inspecties, documenten en bewijsstukken aandacht vragen.'], ['Veilige disclaimer', safeClaimNl]],
  ['nl/kwaliteitscontrole-staalbouw', 'Kwaliteitscontrole staalbouw software | WeldInspect Pro', 'Ondersteun QA/QC, open punten, inspecties en projectdocumentatie binnen staalbouwprojecten met duidelijke status en bewijs.', 'Kwaliteitscontrole software voor staalbouw.', 'Kwaliteitscontrole', ['Open punten volgen', 'Maak bevindingen, verantwoordelijken en status zichtbaar in de projectcontext.'], ['Review rustiger maken', 'QA/QC-teams zien bewijs, documenten en inspectiestatus bij elkaar.'], ['Projectdocumentatie verbinden', 'Kwaliteitscontrole sluit aan op overdracht en dossieropbouw.']],
  ['nl/lasdossier-software', 'Lasdossier software | WeldInspect Pro', 'Beheer lasrecords, WPS/WPQ, inspecties, bewijs, rapportage en overdracht overzichtelijk binnen een digitaal lasdossier.', 'Lasdossier software.', 'Lasdossier', ['Lasrecords centraal houden', 'Houd lasnummers, status, inspecties en bewijs bij elkaar.'], ['WPS/WPQ en inspectie koppelen', 'Procedurecontext en inspectiebewijs blijven zichtbaar rond dezelfde las.'], ['Rapportage en overdracht', 'Gebruik gestructureerde records voor betere overdracht.']],
  ['nl/projectdocumentatie-staalbouw', 'Projectdocumentatie staalbouw beheren | WeldInspect Pro', 'Beheer projectdocumentatie voor staalbouw met lasinspecties, materiaalcertificaten, documenten en overdracht in een helder werkproces.', 'Projectdocumentatie voor staalbouw overzichtelijk beheren.', 'Projectdocumentatie', ['Projecten en documenten structureren', 'Koppel documenten, inspecties en materiaalbewijs aan de juiste projectcontext.'], ['Minder zoekwerk bij overdracht', 'Teams zien eerder welke informatie nog ontbreekt.'], ['Geschikt voor projectteams', 'Staalbouwers, QA/QC en documentatieteams werken vanuit dezelfde context.']],
  ['nl/inspectiepunten-opvolgen', 'Inspectiepunten opvolgen | WeldInspect Pro', 'Volg inspectiepunten, open acties, bevindingen en verantwoordelijkheden op binnen staalbouw- en lasinspectieprojecten.', 'Inspectiepunten opvolgen in staalbouwprojecten.', 'Open punten', ['Bevindingen duidelijk vastleggen', 'Leg bevindingen vast met status, foto en projectcontext.'], ['Verantwoordelijkheden zichtbaar maken', 'Maak duidelijk wie een open punt moet beoordelen of opvolgen.'], ['Review voor overdracht', 'Gebruik open punten om overdracht eerder voor te bereiden.']],
].map(([route, title, description, h1, kicker, ...pairs]) => ({
  route: `/${route}`,
  title,
  description,
  h1,
  kicker,
  intro: description,
  image: '/assets/images/marketing/optimized/photo-inspector-tablet.jpg',
  sections: [
    ...pairs,
    ['Interne samenhang', 'Deze pagina sluit aan op lasinspectie software, EN 1090 software en CE-dossier software zodat bezoekers natuurlijk door de kennisstructuur kunnen navigeren.'],
    ['Veilige normcontext', safeClaimNl],
  ],
  faq: [
    ['Voor wie is deze pagina bedoeld?', 'Voor staalbouwers, QA/QC-teams, lasco&ouml;rdinatoren en documentatieteams die meer grip willen op inspectie en documentatie.'],
    ['Vervangt WeldInspect Pro formele beoordeling?', 'Nee. De software ondersteunt werkprocessen en documentatie; bevoegde beoordeling en offici&euml;le normteksten blijven leidend.'],
    ['Welke vervolgstap past hierbij?', 'Bekijk de demo, start een proefperiode of neem contact op voor een gerichte workflowbespreking.'],
  ],
  links: ['/nl/lasinspectie-software', '/nl/en-1090-software', '/nl/ce-dossier-software', '/nl/demo'],
}));

const enArticles = [
  ['/resources/what-is-a-ce-dossier', 'What is a CE dossier?', 'A practical explanation of CE dossier structure for steel construction documentation teams.'],
  ['/resources/en-1090-documentation-checklist', 'EN 1090 documentation checklist', 'A practical checklist-style guide for EN 1090 documentation workflows without copying official standard text.'],
  ['/resources/digital-weld-inspection-records', 'Digital weld inspection records', 'How digital inspection records help teams keep findings, photos and status connected.'],
  ['/resources/wps-vs-wpq-explained', 'WPS vs WPQ explained', 'A practical explanation of the difference between WPS and WPQ context in project documentation.'],
  ['/resources/linking-inspection-photos-to-weld-records', 'Linking inspection photos to weld records', 'Why photos become more useful when they stay connected to weld records and findings.'],
  ['/resources/material-traceability-explained', 'Material traceability explained', 'How certificates, heat numbers and batch references support steel construction documentation.'],
  ['/resources/preventing-dossier-stress-before-handover', 'Preventing dossier stress before handover', 'How teams can reduce last-minute document chasing before project delivery.'],
  ['/resources/weld-inspection-documents', 'Weld inspection documents', 'The common document types around weld inspection, evidence and handover preparation.'],
  ['/resources/open-actions-in-qa-qc', 'Open actions in QA/QC', 'How open actions help quality teams focus review and follow-up work.'],
  ['/resources/reporting-during-project-execution', 'Reporting during project execution', 'Why reporting works better when records are structured before delivery pressure starts.'],
  ['/resources/why-spreadsheets-fall-short-for-weld-documentation', 'Why spreadsheets fall short for weld documentation', 'Where spreadsheets become fragile for inspection evidence, status and handover work.'],
  ['/resources/combining-wps-inspections-and-ce-dossier', 'Combining WPS, inspections and CE dossier work', 'How procedure context, inspection records and dossier preparation can stay connected.'],
].map(([route, title, description]) => ({ route, title: `${title} | WeldInspect Pro`, cardTitle: title, description }));

const nlArticles = [
  ['/nl/blog/wat-is-een-ce-dossier', 'Wat is een CE-dossier?', 'Praktische uitleg over CE-dossierstructuur voor staalbouw- en documentatieteams.'],
  ['/nl/blog/en-1090-documentatie-checklist', 'EN 1090-documentatie checklist', 'Een praktische checklist voor documentatiewerk rond EN 1090 zonder offici&euml;le normtekst te vervangen.'],
  ['/nl/blog/lasinspecties-digitaal-vastleggen', 'Lasinspecties digitaal vastleggen', 'Hoe digitale inspectierecords helpen om bevindingen, foto&rsquo;s en status gekoppeld te houden.'],
  ['/nl/blog/verschil-tussen-wps-en-wpq', 'Verschil tussen WPS en WPQ', 'Praktische uitleg over WPS/WPQ-context binnen projectdocumentatie.'],
  ['/nl/blog/inspectiefotos-koppelen-aan-lasrecords', 'Inspectiefoto&rsquo;s koppelen aan lasrecords', 'Waarom inspectiefoto&rsquo;s waardevoller zijn wanneer ze bij de juiste las en bevinding blijven.'],
  ['/nl/blog/materiaaltraceerbaarheid-uitgelegd', 'Materiaaltraceerbaarheid uitgelegd', 'Hoe certificaten, heat numbers en batchinformatie bijdragen aan projectdocumentatie.'],
  ['/nl/blog/dossierstress-voorkomen-bij-oplevering', 'Dossierstress voorkomen bij oplevering', 'Hoe teams last-minute zoekwerk voor dossiers kunnen verminderen.'],
  ['/nl/blog/documenten-bij-lasinspectie', 'Documenten bij lasinspectie', 'Welke documenten vaak rond lasinspectie, bewijs en overdracht terugkomen.'],
  ['/nl/blog/open-punten-in-kwaliteitscontrole', 'Open punten in kwaliteitscontrole', 'Hoe open punten QA/QC-teams helpen om opvolging en review scherper te maken.'],
  ['/nl/blog/rapportage-tijdens-uitvoering', 'Rapportage tijdens uitvoering', 'Waarom rapportage sterker wordt als records al tijdens uitvoering worden gestructureerd.'],
  ['/nl/blog/waarom-spreadsheets-tekortschieten-bij-lasdocumentatie', 'Waarom spreadsheets tekortschieten bij lasdocumentatie', 'Waar spreadsheets kwetsbaar worden voor inspectiebewijs, status en overdracht.'],
  ['/nl/blog/wps-inspecties-en-ce-dossier-combineren', 'WPS, inspecties en CE-dossier combineren', 'Hoe procedurecontext, inspectierecords en dossieropbouw verbonden blijven.'],
].map(([route, title, description]) => ({ route, title: `${title} | WeldInspect Pro`, cardTitle: title, description }));

function esc(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function routeFile(route) {
  if (route === '/') return 'index.html';
  if (route === '/nl/') return 'nl/index.html';
  return `${route.replace(/^\/+|\/$/g, '')}.html`;
}

function canonical(route) {
  return `${base}${route}`;
}

function alternateTags(route) {
  const pair = alternatePairs.get(route);
  if (!pair) return '';
  const [nlRoute, enRoute] = pair;
  return `<link rel="alternate" hreflang="en" href="${canonical(enRoute)}">
  <link rel="alternate" hreflang="nl" href="${canonical(nlRoute)}">
  <link rel="alternate" hreflang="x-default" href="${canonical(enRoute)}">`;
}

function header(lang = 'en') {
  const nl = lang === 'nl';
  const links = nl
    ? [['Lasinspectie software', '/nl/lasinspectie-software'], ['EN 1090', '/nl/en-1090-software'], ['CE-dossier', '/nl/ce-dossier-software'], ['Prijzen', '/nl/prijzen'], ['Kennisbank', '/nl/blog/'], ['Contact', '/nl/contact']]
    : [['Platform', '/platform'], ['Inspections', '/inspections'], ['Standards', '/standards'], ['Reports', '/reports'], ['Pricing', '/pricing'], ['Resources', '/resources'], ['Contact', '/contact']];
  return `<header class="site-header"><div class="container nav-shell"><a class="brand" href="${nl ? '/nl' : '/'}" aria-label="WeldInspect Pro home"><span class="brand-mark">W</span><span><strong>WELDINSPECT <em>PRO</em></strong><small>${nl ? 'Digitale lasinspectie &amp; dossieropbouw' : 'Weld inspection &amp; documentation'}</small></span></a><nav class="desktop-nav" aria-label="${nl ? 'Hoofdnavigatie' : 'Main navigation'}">${links.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</nav><div class="nav-actions"><a class="btn btn-ghost" href="https://app.weldinspectpro.com/login">${nl ? 'Inloggen' : 'Login'}</a><a class="btn btn-primary" href="${nl ? '/nl/trial' : '/trial'}">${nl ? 'Start proefperiode' : 'Start Free Trial'}</a><a class="btn-lang" href="${nl ? '/' : '/nl'}" lang="${nl ? 'en' : 'nl'}">${nl ? 'EN' : 'NL'}</a></div><button class="menu-button" type="button" aria-label="${nl ? 'Menu openen' : 'Open menu'}" aria-controls="mobileMenu" aria-expanded="false"><span></span><span></span><span></span></button></div><nav class="mobile-menu" id="mobileMenu" aria-label="${nl ? 'Mobiele navigatie' : 'Mobile navigation'}">${links.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}<a class="btn btn-ghost" href="https://app.weldinspectpro.com/login">${nl ? 'Inloggen' : 'Login'}</a><a class="btn btn-primary" href="${nl ? '/nl/trial' : '/trial'}">${nl ? 'Start proefperiode' : 'Start Free Trial'}</a></nav></header>`;
}

function footer(lang = 'en') {
  const nl = lang === 'nl';
  return `<footer class="footer" id="footer"><div class="container footer-grid"><div class="footer-brand"><a class="brand" href="${nl ? '/nl' : '/'}"><span class="brand-mark">W</span><span><strong>WELDINSPECT <em>PRO</em></strong><small>${nl ? 'Digitale lasinspectie &amp; dossieropbouw' : 'Weld inspection &amp; documentation'}</small></span></a><p>${nl ? 'Gecontroleerde werkprocessen voor lasinspecties, traceerbaarheid en projectdocumentatie.' : 'Controlled workflows for weld inspections, evidence, traceability and project documentation.'}</p><p><a href="mailto:info@weldinspectpro.com">info@weldinspectpro.com</a></p></div><div><h4>${nl ? 'Platform' : 'Platform'}</h4><a href="${nl ? '/nl/lasinspectie-software' : '/platform'}">${nl ? 'Lasinspectie software' : 'Platform overview'}</a><a href="${nl ? '/nl/en-1090-software' : '/inspections'}">${nl ? 'EN 1090' : 'Inspection software'}</a><a href="${nl ? '/nl/ce-dossier-software' : '/standards'}">${nl ? 'CE-dossier' : 'Standards'}</a><a href="${nl ? '/nl/blog/' : '/resources'}">${nl ? 'Kennisbank' : 'Resources'}</a></div><div><h4>${nl ? 'Verdieping' : 'Workflows'}</h4><a href="${nl ? '/nl/wps-wpq-documentatie' : '/wps-wpq-documentation-software'}">WPS/WPQ</a><a href="${nl ? '/nl/materiaaltraceerbaarheid' : '/material-traceability-software'}">${nl ? 'Materiaaltraceerbaarheid' : 'Material traceability'}</a><a href="${nl ? '/nl/kwaliteitscontrole-staalbouw' : '/qa-qc-software-welding'}">QA/QC</a><a href="${nl ? '/nl/projectdocumentatie-staalbouw' : '/steel-construction-documentation-software'}">${nl ? 'Projectdocumentatie' : 'Project documentation'}</a></div><div><h4>${nl ? 'Juridisch' : 'Legal'}</h4><a href="/legal.html">${nl ? 'Juridisch centrum' : 'Legal Center'}</a><a href="/terms.html">${nl ? 'Voorwaarden' : 'Terms'}</a><a href="/privacy.html">Privacy</a><a href="/dpa.html">${nl ? 'Verwerkersovereenkomst' : 'DPA'}</a></div></div><div class="container copyright">&copy; 2026 WeldInspect Pro. ${nl ? 'Alle rechten voorbehouden.' : 'All rights reserved.'}</div></footer>`;
}

function schemas({ route, title, description, type = 'WebPage', faq = [], article = false }) {
  const list = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'WeldInspect Pro', url: base, email: 'info@weldinspectpro.com' },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'WeldInspect Pro', url: base },
    { '@context': 'https://schema.org', '@type': article ? 'Article' : type, headline: title.replace(' | WeldInspect Pro', ''), name: title.replace(' | WeldInspect Pro', ''), description, url: canonical(route), publisher: { '@type': 'Organization', name: 'WeldInspect Pro' } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'WeldInspect Pro', item: base }, { '@type': 'ListItem', position: 2, name: title.replace(' | WeldInspect Pro', ''), item: canonical(route) }] },
  ];
  if (!article) list.push({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'WeldInspect Pro', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: base, description });
  if (faq.length) list.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })) });
  return `<script type="application/ld+json">${JSON.stringify(list)}</script>`;
}

function shell({ lang = 'en', route, title, description, body, faq = [], type = 'WebPage', article = false }) {
  const nl = lang === 'nl';
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${canonical(route)}">
  ${alternateTags(route)}
  <meta property="og:type" content="${article ? 'article' : 'website'}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical(route)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#071426">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/site.css"><link rel="stylesheet" href="/assets/css/enterprise.css"><link rel="stylesheet" href="/assets/css/super-premium.css"><link rel="stylesheet" href="/assets/css/premium-completion.css">
  ${schemas({ route, title, description, type, faq, article })}
</head>
<body>${header(lang)}<main>${body}</main>${footer(lang)}<script src="/assets/js/site.js?v=20260604-seo-clusters"></script><script src="/assets/js/enterprise.js"></script></body></html>`;
}

function landingPage(page, lang = 'en') {
  const nl = lang === 'nl';
  const faq = page.faq;
  const body = `<section class="route-hero"><div class="container route-hero-grid"><div><p class="kicker">${page.kicker}</p><h1>${page.h1}</h1><p class="lead">${page.intro}</p><div class="hero-actions"><a class="btn btn-primary btn-large" href="${nl ? '/nl/trial' : '/trial'}">${nl ? 'Start proefperiode' : 'Start free trial'}</a><a class="btn btn-outline btn-large" href="${nl ? '/nl/demo' : '/demo'}">${nl ? 'Plan demo' : 'Book a demo'}</a></div></div><div class="route-hero-media"><img src="${page.image}" alt=""><div class="media-card"><div class="product-frame product-dashboard"><div class="product-sidebar"><strong>W</strong>${(nl ? ['Projecten', 'Lassen', 'Inspecties', 'Bewijs', 'Documenten', 'Overdracht'] : ['Projects', 'Welds', 'Inspections', 'Evidence', 'Documents', 'Handover']).map((x) => `<span>${x}</span>`).join('')}</div><div class="product-main"><div class="product-top"><b>${nl ? 'Documentatieoverzicht' : 'Documentation overview'}</b><em>${nl ? 'Verbonden' : 'Connected'}</em></div><div class="metric-row"><span><b>18</b>${nl ? 'Projecten' : 'Projects'}</span><span><b>742</b>${nl ? 'Lassen' : 'Welds'}</span><span><b>86</b>${nl ? 'Inspecties' : 'Inspections'}</span><span><b>12</b>${nl ? 'Open punten' : 'Open items'}</span></div><div class="product-grid"><div class="donut"><b>86%</b><small>${nl ? 'Dossiergereedheid' : 'Dossier readiness'}</small></div><div class="activity"><p><strong>${nl ? 'Bewijs gekoppeld' : 'Evidence linked'}</strong><small>${nl ? 'Foto, bevinding en document bij elkaar' : 'Photo, finding and document connected'}</small></p><p><strong>${nl ? 'Review voorbereid' : 'Review prepared'}</strong><small>${nl ? 'Open punten zichtbaar voor QA/QC' : 'Open items visible for QA/QC'}</small></p></div></div></div></div></div></div></div></section>
<section class="section"><div class="container"><div class="visual-card-grid">${page.sections.map(([h, p], i) => `<article class="visual-card"><span>${String(i + 1).padStart(2, '0')}</span><h2>${h}</h2><p>${p}</p></article>`).join('')}</div></div></section>
<section class="section section-alt"><div class="container"><div class="section-head"><span class="kicker">${nl ? 'Gerelateerde routes' : 'Related routes'}</span><h2>${nl ? 'Verder lezen binnen hetzelfde werkproces.' : 'Continue through the connected workflow.'}</h2></div><div class="workflow-link-grid">${page.links.map((href) => `<a href="${href}">${labelFor(href)}<small>${nl ? 'Relevante verdieping en vervolgstap.' : 'Relevant product context and next step.'}</small></a>`).join('')}</div></div></section>
<section class="section"><div class="container"><div class="section-head"><span class="kicker">FAQ</span><h2>${nl ? 'Veelgestelde vragen' : 'Frequently asked questions'}</h2></div><div class="route-panel">${faq.map(([q, a]) => `<article class="route-card"><h3>${q}</h3><p>${a}</p></article>`).join('')}</div></div></section>
<section class="final-cta visual-cta"><div class="container final-panel"><div><h2>${nl ? 'Breng inspecties, bewijs en dossieropbouw samen.' : 'Ready to connect weld inspection and documentation?'}</h2><p>${nl ? 'Plan een demo of start een proefperiode om de werkprocessen in context te bekijken.' : 'Book a demo or start a trial to review the workflow in context.'}</p></div><div class="final-actions"><a class="btn btn-primary btn-large" href="${nl ? '/nl/trial' : '/trial'}">${nl ? 'Start proefperiode' : 'Start Free Trial'}</a><a class="btn btn-outline btn-large" href="${nl ? '/nl/contact' : '/contact'}">${nl ? 'Contact' : 'Contact'}</a></div></div></section>`;
  return shell({ lang, route: page.route, title: page.title, description: page.description, body, faq, type: 'WebPage' });
}

function labelFor(href) {
  return href.replace(/^\/nl\/blog\//, '').replace(/^\/resources\//, '').replace(/^\/nl\//, '').replace(/^\//, '').replaceAll('-', ' ') || 'WeldInspect Pro';
}

function articlePage(article, lang = 'en') {
  const nl = lang === 'nl';
  const clusterLinks = nl ? ['/nl/lasinspectie-software', '/nl/en-1090-software', '/nl/ce-dossier-software', '/nl/contact'] : ['/inspections', '/standards', '/reports', '/demo'];
  const sections = nl
    ? [
        ['Waarom dit onderwerp belangrijk is', 'In staalbouw- en lasprojecten ontstaat documentatiedruk vaak wanneer inspecties, bewijs en documenten los van elkaar worden beheerd. Een duidelijk werkproces helpt teams eerder te zien wat compleet is en wat aandacht vraagt.'],
        ['Wat teams praktisch kunnen vastleggen', 'Denk aan projectcontext, lasrecords, inspectieresultaten, foto&rsquo;s, materiaalbewijs, WPS/WPQ-context, open punten en overdrachtsnotities. Niet elk project gebruikt dezelfde structuur, maar de samenhang is belangrijk.'],
        ['Hoe dit aansluit op WeldInspect Pro', 'WeldInspect Pro helpt om projectinformatie, inspecties en bewijs in dezelfde documentatiestroom zichtbaar te houden. Daardoor kunnen QA/QC, lasco&ouml;rdinatie en documentatieteams rustiger samenwerken.'],
        ['Veilige normcontext', safeClaimNl],
      ]
    : [
        ['Why this topic matters', 'Welding and steel construction teams often feel documentation pressure when inspections, evidence and files are managed separately. A connected workflow helps teams see what is complete and what still needs attention.'],
        ['What teams can record', 'Project context, weld records, inspection results, photos, material evidence, WPS/WPQ context, open actions and handover notes can all become part of a clearer documentation flow.'],
        ['How this connects to WeldInspect Pro', 'WeldInspect Pro helps teams keep project information, inspections and evidence visible in the same documentation workflow so QA/QC, welding coordination and documentation teams can work with less searching.'],
        ['Safe standards context', safeClaimEn],
      ];
  const body = `<section class="route-hero"><div class="container route-hero-grid"><div><p class="kicker">${nl ? 'Kennisbank' : 'Knowledge hub'}</p><h1>${article.cardTitle}</h1><p class="lead">${article.description}</p><div class="hero-actions"><a class="btn btn-primary btn-large" href="${nl ? '/nl/demo' : '/demo'}">${nl ? 'Plan demo' : 'Book a demo'}</a><a class="btn btn-outline btn-large" href="${nl ? '/nl/blog/' : '/resources'}">${nl ? 'Terug naar kennisbank' : 'Back to resources'}</a></div></div><div class="route-hero-media"><img src="/assets/images/marketing/optimized/mobile-inspection.jpg" alt=""></div></div></section>
<article class="section"><div class="container"><div class="visual-card-grid">${sections.map(([h, p], i) => `<section class="visual-card"><span>${String(i + 1).padStart(2, '0')}</span><h2>${h}</h2><p>${p}</p></section>`).join('')}</div></div></article>
<section class="section section-alt"><div class="container"><div class="section-head"><span class="kicker">${nl ? 'Gerelateerde pagina&rsquo;s' : 'Related pages'}</span><h2>${nl ? 'Ga verder binnen dezelfde kennisstructuur.' : 'Continue through the same content cluster.'}</h2></div><div class="workflow-link-grid">${clusterLinks.map((href) => `<a href="${href}">${labelFor(href)}<small>${nl ? 'Relevante verdieping of vervolgstap.' : 'Relevant context or next step.'}</small></a>`).join('')}</div></div></section>
<section class="final-cta visual-cta"><div class="container final-panel"><div><h2>${nl ? 'Wilt u dit werkproces in de praktijk zien?' : 'Want to see this workflow in practice?'}</h2><p>${nl ? 'Plan een demo of neem contact op voor een gerichte bespreking.' : 'Book a demo or contact us for a focused workflow discussion.'}</p></div><div class="final-actions"><a class="btn btn-primary btn-large" href="${nl ? '/nl/demo' : '/demo'}">${nl ? 'Plan demo' : 'Book a Demo'}</a><a class="btn btn-outline btn-large" href="${nl ? '/nl/contact' : '/contact'}">${nl ? 'Contact' : 'Contact'}</a></div></div></section>`;
  return shell({ lang, route: article.route, title: article.title, description: article.description, body, article: true, type: 'Article' });
}

function hubPage(lang = 'en') {
  const nl = lang === 'nl';
  const articles = nl ? nlArticles : enArticles;
  const route = nl ? '/nl/blog/' : '/resources';
  const title = nl ? 'Kennisbank lasinspectie en dossieropbouw | WeldInspect Pro' : 'Weld Inspection Knowledge Hub | WeldInspect Pro';
  const description = nl ? 'Kennisbank voor lasinspectie, EN 1090-documentatie, CE-dossiers, WPS/WPQ, materiaaltraceerbaarheid en kwaliteitscontrole.' : 'Knowledge hub for weld inspection, EN 1090 documentation, CE dossiers, WPS/WPQ, material traceability and QA/QC workflows.';
  const body = `<section class="route-hero"><div class="container route-hero-grid"><div><p class="kicker">${nl ? 'Kennisbank' : 'Knowledge hub'}</p><h1>${nl ? 'Praktische kennis voor lasinspectie, EN 1090 en dossieropbouw.' : 'Practical resources for weld inspection, EN 1090 and dossier workflows.'}</h1><p class="lead">${description}</p><div class="hero-actions"><a class="btn btn-primary btn-large" href="${nl ? '/nl/demo' : '/demo'}">${nl ? 'Plan demo' : 'Book a demo'}</a><a class="btn btn-outline btn-large" href="${nl ? '/nl/trial' : '/trial'}">${nl ? 'Start proefperiode' : 'Start free trial'}</a></div></div><div class="route-hero-media"><img src="/assets/images/marketing/optimized/inspectors-onsite.jpg" alt=""></div></div></section>
<section class="section"><div class="container"><div class="section-head"><span class="kicker">${nl ? 'Categorie&euml;n' : 'Categories'}</span><h2>${nl ? 'Navigeer per werkproces.' : 'Navigate by workflow.'}</h2></div><div class="knowledge-grid">${articles.map((a) => `<a class="knowledge-card" href="${a.route}"><span>${nl ? 'Gids' : 'Guide'}</span><h3>${a.cardTitle}</h3><p>${a.description}</p></a>`).join('')}</div></div></section>
<section class="section section-alt"><div class="container"><div class="section-head"><span class="kicker">${nl ? 'Clusterpagina&rsquo;s' : 'Cluster pages'}</span><h2>${nl ? 'Ga naar de belangrijkste product- en documentatieroutes.' : 'Go to the main product and documentation routes.'}</h2></div><div class="workflow-link-grid">${(nl ? ['/nl/lasinspectie-software', '/nl/en-1090-software', '/nl/ce-dossier-software', '/nl/wps-wpq-documentatie', '/nl/materiaaltraceerbaarheid', '/nl/kwaliteitscontrole-staalbouw'] : ['/inspections', '/ce-dossier-software', '/wps-wpq-documentation-software', '/material-traceability-software', '/qa-qc-software-welding', '/steel-construction-documentation-software']).map((href) => `<a href="${href}">${labelFor(href)}<small>${nl ? 'Verdieping binnen dit werkproces.' : 'Deeper context for this workflow.'}</small></a>`).join('')}</div></div></section>`;
  return shell({ lang, route, title, description, body, type: 'CollectionPage' });
}

function writeRoute(route, html) {
  const file = routeFile(route);
  writeFileSync(join(root, file), html, 'utf8');
  const clean = route.replace(/^\/+|\/$/g, '');
  if (clean) {
    const target = join(root, clean, 'index.html');
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(root, file), target);
  }
}

function updateRedirects(routes) {
  const file = join(root, '_redirects');
  let text = readFileSync(file, 'utf8');
  const lines = new Set(text.split(/\r?\n/).filter(Boolean));
  for (const route of routes) {
    if (route === '/' || route.endsWith('/')) continue;
    lines.add(`${route}.html ${route} 301`);
  }
  writeFileSync(file, `${[...lines].join('\n')}\n`, 'utf8');
}

function updateSitemap(routes) {
  const all = [...new Set([...coreEn, ...coreNl, ...routes])];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${all.map((route) => `  <url><loc>${canonical(route)}</loc><lastmod>${lastmod}</lastmod><changefreq>${route.includes('/blog') || route.includes('/resources') ? 'weekly' : 'monthly'}</changefreq><priority>${route === '/' || route === '/nl/' ? '1.0' : route.includes('privacy') || route.includes('terms') || route.includes('legal') || route.includes('dpa') ? '0.4' : '0.8'}</priority></url>`).join('\n')}\n</urlset>\n`;
  writeFileSync(join(root, 'sitemap.xml'), xml, 'utf8');
  writeFileSync(join(root, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\nSitemap: ${base}/legal-sitemap.xml\n`, 'utf8');
}

function routeToExistingFile(route) {
  if (route === '/') return 'index.html';
  if (route === '/nl/' || route === '/nl/blog/') return `${route.replace(/^\/+|\/$/g, '')}/index.html`;
  return `${route.replace(/^\/+|\/$/g, '')}.html`;
}

function updateCoreRouteLinks() {
  const enRoutes = ['/', '/platform', '/inspections', '/reports', '/pricing', '/demo', '/trial', '/contact', '/standards', '/resources'];
  const nlRoutes = ['/nl/', '/nl/lasinspectie-software', '/nl/en-1090-software', '/nl/ce-dossier-software', '/nl/prijzen', '/nl/demo', '/nl/trial', '/nl/contact', '/nl/blog/'];
  const enBand = `<section class="section section-alt route-link-band"><div class="container"><div class="section-head"><span class="kicker">Connected workflows</span><h2>Explore the documentation routes around this page.</h2><p>Move from weld inspection to WPS/WPQ context, material traceability, CE dossier preparation and handover reporting without losing the project thread.</p></div><div class="workflow-link-grid"><a href="/wps-wpq-documentation-software">WPS/WPQ documentation<small>Procedure and qualification context connected to project records.</small></a><a href="/material-traceability-software">Material traceability<small>Certificates, heat numbers and evidence kept findable.</small></a><a href="/ce-dossier-software">CE dossier software<small>Build dossier structure while work is still in progress.</small></a><a href="/qa-qc-software-welding">QA/QC workflows<small>Open actions, review status and handover pressure made visible.</small></a></div></div></section>`;
  const nlBand = `<section class="section section-alt route-link-band"><div class="container"><div class="section-head"><span class="kicker">Verbonden werkprocessen</span><h2>Bekijk de documentatieroutes rondom deze pagina.</h2><p>Ga van lasinspectie naar WPS/WPQ-context, materiaaltraceerbaarheid, CE-dossieropbouw en rapportage zonder de projectlijn kwijt te raken.</p></div><div class="workflow-link-grid"><a href="/nl/lasinspectie-software">Lasinspectie software<small>Inspecties, bevindingen en bewijs op projectniveau.</small></a><a href="/nl/en-1090-software">EN 1090 software<small>Documentatiewerkprocessen rondom staalbouwprojecten.</small></a><a href="/nl/ce-dossier-software">CE dossier software<small>Dossierstatus, bewijs en overdracht overzichtelijk houden.</small></a><a href="/nl/materiaaltraceerbaarheid">Materiaaltraceerbaarheid<small>Certificaten, heatnummers en projectbewijs beter vindbaar.</small></a></div></div></section>`;
  for (const route of enRoutes) {
    const file = join(root, routeToExistingFile(route));
    if (!existsSync(file)) continue;
    let html = readFileSync(file, 'utf8');
    if (html.includes('route-link-band')) continue;
    html = html.replace('</main>', `${enBand}</main>`);
    writeFileSync(file, html, 'utf8');
  }
  for (const route of nlRoutes) {
    const file = join(root, routeToExistingFile(route));
    if (!existsSync(file)) continue;
    let html = readFileSync(file, 'utf8');
    if (html.includes('route-link-band')) continue;
    html = html.replace('</main>', `${nlBand}</main>`);
    writeFileSync(file, html, 'utf8');
  }
}

const generatedRoutes = [];
for (const page of enLanding) {
  writeRoute(page.route, landingPage(page, 'en'));
  generatedRoutes.push(page.route);
}
for (const page of nlLanding) {
  writeRoute(page.route, landingPage(page, 'nl'));
  generatedRoutes.push(page.route);
}
for (const article of enArticles) {
  writeRoute(article.route, articlePage(article, 'en'));
  generatedRoutes.push(article.route);
}
for (const article of nlArticles) {
  writeRoute(article.route, articlePage(article, 'nl'));
  generatedRoutes.push(article.route);
}
writeRoute('/resources', hubPage('en'));
writeRoute('/nl/blog/', hubPage('nl'));
updateRedirects(generatedRoutes);
updateSitemap(generatedRoutes);
updateCoreRouteLinks();

console.log(`Generated ${generatedRoutes.length} SEO cluster routes plus resources hubs.`);
