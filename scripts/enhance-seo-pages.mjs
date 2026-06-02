import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const css = ['/assets/css/site.css', '/assets/css/enterprise.css', '/assets/css/super-premium.css'];

function esc(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function head({ title, description, canonical, image = '/assets/images/marketing/hero-welder-action.jpg', schema = [] }) {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'WeldInspect Pro',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://weldinspectpro.com/',
      description,
    },
    ...schema,
  ];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="https://weldinspectpro.com${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="https://weldinspectpro.com${canonical}">
  <meta property="og:image" content="https://weldinspectpro.com${image}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#071426">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  ${css.map((href) => `<link rel="stylesheet" href="${href}">`).join('')}
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>`;
}

function header() {
  const nav = [
    ['Platform', '/platform'],
    ['Inspections', '/inspections'],
    ['Standards', '/standards'],
    ['Reports', '/reports'],
    ['Pricing', '/pricing'],
    ['Resources', '/resources'],
    ['Contact', '/contact'],
  ];
  return `<header class="site-header"><div class="container nav-shell"><a class="brand" href="/" aria-label="WeldInspect Pro home"><span class="brand-mark">W</span><span><strong>WELDINSPECT <em>PRO</em></strong><small>Weld inspection & documentation</small></span></a><nav class="desktop-nav" aria-label="Main navigation">${nav.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</nav><div class="nav-actions"><a class="btn btn-ghost" href="https://app.weldinspectpro.com/login">Login</a><a class="btn btn-primary" href="/trial">Start Free Trial</a><a class="btn-lang" href="/nl/" lang="nl">NL</a></div><button class="menu-button" type="button" aria-label="Open menu" aria-controls="mobileMenu" aria-expanded="false"><span></span><span></span><span></span></button></div><nav class="mobile-menu" id="mobileMenu" aria-label="Mobile navigation">${nav.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}<a class="btn btn-ghost" href="https://app.weldinspectpro.com/login">Login</a><a class="btn btn-primary" href="/trial">Start Free Trial</a></nav></header>`;
}

function footer() {
  return `<footer class="footer" id="footer"><div class="container footer-grid"><div class="footer-brand"><a class="brand" href="/"><span class="brand-mark">W</span><span><strong>WELDINSPECT <em>PRO</em></strong><small>Weld inspection & documentation</small></span></a><p>Controlled workflows for weld inspections, evidence, traceability and project documentation.</p><p><!--email_off--><a href="mailto:info@weldinspectpro.com">info@weldinspectpro.com</a><!--/email_off--></p></div><div><h4>Platform</h4><a href="/platform">Platform overview</a><a href="/inspections">Inspection software</a><a href="/standards">Standards</a><a href="/reports">Reports</a></div><div><h4>Workflows</h4><a href="/en-1090">EN 1090 software</a><a href="/iso-3834">ISO 3834</a><a href="/iso-5817">ISO 5817</a><a href="/en-10204">Material traceability</a></div><div><h4>Legal</h4><a href="/legal.html">Legal Center</a><a href="/terms.html">Terms</a><a href="/privacy.html">Privacy</a><a href="/dpa.html">DPA</a></div></div><div class="container copyright">&copy; 2026 WeldInspect Pro. All rights reserved. <a href="/pricing">Pricing</a> · <a href="/trial">Trial</a> · <a href="/demo">Demo</a> · <a href="/contact">Contact</a></div></footer><script src="/assets/js/site.js?v=20260602-seo-routes"></script><script src="/assets/js/enterprise.js"></script>`;
}

const productMockup = `<div class="product-frame product-dashboard"><div class="product-sidebar"><strong>W</strong><span>Projects</span><span>Welds</span><span>Inspections</span><span>WPS/WPQ</span><span>Documents</span><span>CE dossier</span></div><div class="product-main"><div class="product-top"><b>Documentation workflow</b><em>Connected</em></div><div class="metric-row"><span><b>24</b>Projects</span><span><b>1,246</b>Welds</span><span><b>318</b>Inspections</span><span><b>16</b>Open actions</span></div><div class="product-grid"><div class="donut"><b>3,012</b><small>Linked records</small></div><div class="activity"><p><strong>Inspection evidence linked</strong><small>Photos, notes and status on the weld record</small></p><p><strong>WPS/WPQ reference visible</strong><small>Procedure context near inspection work</small></p><p><strong>Material certificate attached</strong><small>Traceability evidence in the project dossier</small></p></div></div></div></div>`;

function faqSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

function pageShell(meta, body) {
  return `${head(meta)}
<body>${header()}<main>${body}</main>${footer()}</body></html>`;
}

function finalCta() {
  return `<section class="final-cta visual-cta"><div class="container final-panel"><div><h2>Ready to connect weld inspection and documentation?</h2><p>Review how WeldInspect Pro helps teams keep project records, inspection evidence and dossier handover work in one controlled flow.</p></div><div class="final-actions"><a class="btn btn-primary btn-large" href="/trial">Start Free Trial</a><a class="btn btn-outline btn-large" href="/demo">Book a Demo</a></div></div></section>`;
}

function standardPage(data) {
  const faq = [
    [`Does WeldInspect Pro replace ${data.shortName}?`, `No. WeldInspect Pro supports documentation workflows around ${data.shortName}. Official standard texts, certification and formal conformity decisions remain leading.`],
    [`Which records can be connected to ${data.shortName} work?`, 'Teams can connect projects, welds, inspection results, WPS/WPQ references, material certificates, photos, documents, open actions and report output.'],
    ['Is this suitable for steel construction QA/QC teams?', 'Yes. The workflow is designed for steel construction, welding coordination, inspection coordination and project documentation teams that need clearer evidence and handover control.'],
  ];
  const schema = [faqSchema(faq)];
  return pageShell({
    title: data.title,
    description: data.description,
    canonical: data.canonical,
    image: data.image,
    schema,
  }, `<section class="route-hero"><div class="container route-hero-grid"><div><p class="kicker">${data.kicker}</p><h1>${data.h1}</h1><p class="lead">${data.lead}</p><div class="hero-actions"><a class="btn btn-primary btn-large" href="/trial">Start free trial</a><a class="btn btn-outline btn-large" href="/demo">Book a demo</a></div></div><div class="route-hero-media"><img src="${data.image}" alt="${data.imageAlt}"><div class="media-card">${productMockup}</div></div></div></section>
<section class="section"><div class="container standards-panel"><div><span class="eyebrow">Safe standards positioning</span><h2>${data.safeH2}</h2><p>WeldInspect Pro supports documentation workflows around relevant standards. Official standard texts, certification and formal conformity decisions remain leading. The software helps teams organise records, evidence and review status; it does not certify projects or replace competent engineering judgement.</p></div><div class="standard-tags">${data.tags.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</div></div></section>
<section class="section section-alt"><div class="container"><div class="section-head"><span class="kicker">Search intent</span><h2>${data.intentH2}</h2><p>${data.intentIntro}</p></div><div class="visual-card-grid">${data.intentCards.map(([h, p], i) => `<article class="visual-card"><span>${String(i + 1).padStart(2, '0')}</span><h3>${h}</h3><p>${p}</p></article>`).join('')}</div></div></section>
<section class="section"><div class="container visual-split"><div><span class="kicker">Workflow detail</span><h2>${data.workflowH2}</h2><p>${data.workflowIntro}</p><ul class="check-list">${data.workflowBullets.map((item) => `<li>${item}</li>`).join('')}</ul></div><img src="/assets/images/marketing/report-preview.jpg" alt="Structured WeldInspect Pro documentation report preview"></div></section>
<section class="section section-alt"><div class="container"><div class="section-head"><span class="kicker">What teams document</span><h2>${data.recordsH2}</h2></div><div class="workflow-grid">${data.records.map(([h, p], i) => `<article class="workflow-step"><div class="step-number">${i + 1}</div><h3>${h}</h3><p>${p}</p></article>`).join('')}</div></div></section>
<section class="section"><div class="container"><div class="section-head"><span class="kicker">Internal links</span><h2>Related WeldInspect Pro workflows</h2><p>Use these pages to connect ${data.shortName} context with inspection, reporting, traceability and product workflows.</p></div><div class="seo-link-grid">${data.related.map(([label, text, href]) => `<a href="${href}">${label}<small>${text}</small></a>`).join('')}</div></div></section>
<section class="section section-alt"><div class="container"><div class="section-head"><span class="kicker">FAQ</span><h2>Common questions about ${data.shortName} documentation workflows</h2></div><div class="route-panel">${faq.map(([q, a]) => `<article class="route-card"><h3>${q}</h3><p>${a}</p></article>`).join('')}</div></div></section>${finalCta()}`);
}

const standardPages = [
  {
    file: 'en-1090.html',
    canonical: '/en-1090',
    shortName: 'EN 1090',
    title: 'EN 1090 Software for Weld Inspection and CE Documentation | WeldInspect Pro',
    description: 'EN 1090 software for steel construction teams that need connected weld inspection evidence, WPS/WPQ references, material traceability and CE dossier documentation.',
    kicker: 'EN 1090 software',
    h1: 'EN 1090 software for weld inspection, traceability and CE dossier control.',
    lead: 'WeldInspect Pro helps steel construction teams structure EN 1090 documentation work around projects, welds, inspections, WPS/WPQ references, certificates, photos and report-ready evidence.',
    safeH2: 'Support EN 1090 documentation without making unsupported compliance promises.',
    intentH2: 'What teams expect from EN 1090 software',
    intentIntro: 'EN 1090 documentation work is rarely just one file. Teams need a practical system for execution context, weld records, inspection evidence, certificates, open actions and handover output.',
    workflowH2: 'From project setup to CE dossier handover',
    workflowIntro: 'WeldInspect Pro keeps EN 1090 project information connected while the work is active, so documentation does not have to be reconstructed at the end of the project.',
    recordsH2: 'Core EN 1090 records that stay connected',
    image: '/assets/images/marketing/hero-welder-action.jpg',
    imageAlt: 'Welder working in a steel construction workshop',
    tags: [['EN 1090', '/en-1090'], ['ISO 3834', '/iso-3834'], ['ISO 5817', '/iso-5817'], ['WPS', '/iso-15609'], ['WPQ', '/iso-9606-1'], ['Material certificates', '/en-10204']],
    intentCards: [
      ['Project documentation', 'Keep project scope, execution context, inspection requirements and dossier status in one place.'],
      ['Weld inspection evidence', 'Record inspection results, findings, photos and open actions against the right weld record.'],
      ['CE dossier readiness', 'Prepare handover with connected evidence instead of chasing documents after fabrication.'],
      ['Traceability', 'Link material certificates, heat numbers and supporting documents to project and weld context.'],
    ],
    workflowBullets: ['Project records, weld lists and inspection activity are linked.', 'WPS/WPQ references remain visible near the work they support.', 'Photos and documents are attached to the relevant project context.', 'Open actions and dossier readiness can be reviewed before delivery pressure peaks.'],
    records: [['Projects', 'Project scope, roles, documents and review context.'], ['Welds', 'Weld numbers, locations, status and evidence anchors.'], ['Inspections', 'Visual checks, findings, photos and follow-up.'], ['WPS/WPQ', 'Procedure and qualification references connected to weld records.'], ['Materials', 'Certificates, heat numbers and traceability evidence.'], ['Reports', 'Structured output for review and handover conversations.']],
    related: [['Platform overview', 'See the connected project and weld workflow.', '/platform'], ['Inspection software', 'Capture weld checks, photos and findings.', '/inspections'], ['Reports', 'Prepare handover and CE dossier output.', '/reports'], ['Standards hub', 'Explore related standards pages.', '/standards']],
  },
  {
    file: 'iso-3834.html',
    canonical: '/iso-3834',
    shortName: 'ISO 3834',
    title: 'ISO 3834 Software for Welding Quality Documentation | WeldInspect Pro',
    description: 'ISO 3834 software support for welding quality documentation, inspection evidence, WPS/WPQ references, traceability and project dossier workflows.',
    kicker: 'ISO 3834 software',
    h1: 'ISO 3834 software for welding quality evidence and documentation workflows.',
    lead: 'WeldInspect Pro helps welding and QA/QC teams keep welding quality records, inspection evidence, procedure references, responsibilities and handover documentation connected.',
    safeH2: 'Support welding quality documentation while official quality requirements remain leading.',
    intentH2: 'What ISO 3834 documentation needs in practice',
    intentIntro: 'ISO 3834-related work depends on visible responsibilities, procedure control, inspection records, subcontractor context, material traceability and consistent reporting.',
    workflowH2: 'Bring welding quality records into one controlled workflow',
    workflowIntro: 'Instead of splitting quality evidence across folders and spreadsheets, WeldInspect Pro keeps welding documentation close to the project and weld records it belongs to.',
    recordsH2: 'Typical ISO 3834 workflow records',
    image: '/assets/images/marketing/photo-inspector-tablet.jpg',
    imageAlt: 'Inspector reviewing welding quality documentation on a tablet',
    tags: [['ISO 3834', '/iso-3834'], ['EN 1090', '/en-1090'], ['WPS', '/iso-15609'], ['WPQ', '/iso-9606-1'], ['Inspections', '/inspections'], ['Reports', '/reports']],
    intentCards: [
      ['Quality responsibility', 'Make project status, inspection progress and open quality actions easier to review.'],
      ['Procedure control', 'Keep WPS/WPQ references visible in the same workflow as welds and inspections.'],
      ['Evidence capture', 'Link inspection results, photos, certificates and notes to the right record.'],
      ['Review preparation', 'Use structured data to support calmer internal and external review conversations.'],
    ],
    workflowBullets: ['Project quality context is visible to coordinators and QA/QC teams.', 'WPS/WPQ references, weld records and inspection outcomes stay connected.', 'Evidence and certificates can be reviewed by project instead of by folder search.', 'Reports are built from structured project data.'],
    records: [['Responsibilities', 'Clear project context and review ownership.'], ['Weld records', 'Weld list status and documentation anchors.'], ['Procedures', 'WPS/WPQ references and qualification context.'], ['Inspection results', 'Findings, open actions and evidence.'], ['Documents', 'Certificates, drawings and supporting files.'], ['Output', 'Structured reporting for review and handover.']],
    related: [['EN 1090 software', 'Connect quality records to steel construction dossier work.', '/en-1090'], ['WPS workflow', 'See procedure documentation context.', '/iso-15609'], ['WPQ workflow', 'See qualification reference context.', '/iso-9606-1'], ['Reports', 'Build review-ready output from records.', '/reports']],
  },
  {
    file: 'iso-5817.html',
    canonical: '/iso-5817',
    shortName: 'ISO 5817',
    title: 'ISO 5817 Weld Quality Inspection Software | WeldInspect Pro',
    description: 'ISO 5817 weld quality software support for visual inspection results, quality level context, findings, photo evidence and weld documentation workflows.',
    kicker: 'ISO 5817 weld quality',
    h1: 'ISO 5817 weld quality inspection software for findings, evidence and follow-up.',
    lead: 'WeldInspect Pro helps teams structure weld inspection findings, visual evidence, open actions and reporting context around quality-level review workflows.',
    safeH2: 'Support ISO 5817 inspection documentation without replacing formal assessment.',
    intentH2: 'What inspectors need around ISO 5817 workflows',
    intentIntro: 'Weld quality review needs clear findings, consistent result states, evidence capture and traceable follow-up. The software keeps those records connected to the weld and project.',
    workflowH2: 'Keep weld quality findings connected to the record they belong to',
    workflowIntro: 'Inspection evidence is easier to review when each finding, photo, comment and status is attached to a weld record rather than stored in separate folders.',
    recordsH2: 'Typical ISO 5817 inspection workflow records',
    image: '/assets/images/marketing/photo-weld-closeup.jpg',
    imageAlt: 'Close-up of a weld prepared for visual inspection',
    tags: [['ISO 5817', '/iso-5817'], ['Inspections', '/inspections'], ['EN 1090', '/en-1090'], ['Reports', '/reports'], ['WPS', '/iso-15609'], ['Traceability', '/en-10204']],
    intentCards: [
      ['Inspection result states', 'Record approved, minor issue, major issue and open status in context.'],
      ['Photo evidence', 'Attach photos directly to the relevant weld or inspection finding.'],
      ['Open actions', 'Follow findings through review and completion instead of losing them in notes.'],
      ['Report output', 'Use structured inspection data in clearer handover and review reports.'],
    ],
    workflowBullets: ['Inspection checks stay linked to weld numbers and project areas.', 'Findings include status, comments and evidence. ', 'Photos and supporting documents remain attached to the right record.', 'Reports can show inspection status and follow-up without manual reconstruction.'],
    records: [['Weld list', 'The anchor for inspection findings.'], ['Inspection checks', 'Structured result states and comments.'], ['Photos', 'Visual evidence connected to findings.'], ['Open actions', 'Follow-up status and review context.'], ['Documents', 'Supporting files and certificates.'], ['Reports', 'Output for quality review and handover.']],
    related: [['Inspection software', 'Capture results, findings and photo evidence.', '/inspections'], ['Reports', 'Turn findings into clearer output.', '/reports'], ['ISO 3834', 'Connect quality records to broader welding quality documentation.', '/iso-3834'], ['Platform', 'See the connected workflow.', '/platform']],
  },
  {
    file: 'iso-15609.html',
    canonical: '/iso-15609',
    shortName: 'ISO 15609 WPS',
    title: 'WPS Software for ISO 15609 Procedure Documentation | WeldInspect Pro',
    description: 'WPS software workflow support for ISO 15609 procedure references, weld records, inspection evidence, WPQ links and project documentation.',
    kicker: 'WPS software',
    h1: 'WPS software for procedure references, weld records and inspection context.',
    lead: 'WeldInspect Pro helps teams keep WPS references visible beside project welds, inspection evidence, qualification context and documentation output.',
    safeH2: 'Support WPS documentation workflows while approved procedure documents remain leading.',
    intentH2: 'What teams need from WPS management software',
    intentIntro: 'WPS information becomes useful when it is connected to welds, projects, inspectors, qualifications and evidence rather than stored as isolated documents.',
    workflowH2: 'Connect procedure references to everyday project execution',
    workflowIntro: 'WeldInspect Pro keeps procedure context close to the weld register and inspection workflow so teams can see which documentation belongs where.',
    recordsH2: 'Typical WPS workflow records',
    image: '/assets/images/marketing/report-preview.jpg',
    imageAlt: 'WPS and project documentation preview',
    tags: [['WPS', '/iso-15609'], ['WPQ', '/iso-9606-1'], ['ISO 3834', '/iso-3834'], ['EN 1090', '/en-1090'], ['Inspections', '/inspections'], ['Reports', '/reports']],
    intentCards: [
      ['Procedure references', 'Keep WPS references available near weld and inspection records.'],
      ['Qualification context', 'Connect WPQ and welder qualification context where it supports the project.'],
      ['Document control', 'Avoid searching separate folders during inspection or handover review.'],
      ['Project reporting', 'Use procedure context in structured reporting and dossier preparation.'],
    ],
    workflowBullets: ['WPS references are visible in project and weld context.', 'Inspection teams can see supporting procedure documentation faster.', 'Procedure and qualification records can support review conversations.', 'Dossier output can reference connected project documentation.'],
    records: [['Procedures', 'WPS references and document status.'], ['Welds', 'Weld records connected to procedure context.'], ['Qualifications', 'WPQ and welder context where relevant.'], ['Inspections', 'Checks and evidence linked to welds.'], ['Documents', 'Supporting files and certificates.'], ['Reports', 'Procedure context in handover output.']],
    related: [['WPQ workflow', 'Qualification reference context for weld records.', '/iso-9606-1'], ['ISO 3834', 'Welding quality documentation workflows.', '/iso-3834'], ['Platform', 'See connected modules.', '/platform'], ['Contact', 'Discuss your WPS workflow.', '/contact']],
  },
  {
    file: 'iso-9606-1.html',
    canonical: '/iso-9606-1',
    shortName: 'ISO 9606-1 WPQ',
    title: 'WPQ Software for ISO 9606-1 Welder Qualification Context | WeldInspect Pro',
    description: 'WPQ software workflow support for ISO 9606-1 qualification references, welder context, WPS links, weld inspection and project documentation.',
    kicker: 'WPQ software',
    h1: 'WPQ software for welder qualification context in project documentation.',
    lead: 'WeldInspect Pro helps welding teams keep WPQ references, welder qualification context, WPS links and inspection evidence connected to project records.',
    safeH2: 'Support WPQ reference workflows while official qualification records remain leading.',
    intentH2: 'What teams need from WPQ management software',
    intentIntro: 'Qualification references become easier to review when they are connected to welds, procedures, inspection evidence and project handover documentation.',
    workflowH2: 'Keep qualification context visible during execution',
    workflowIntro: 'Instead of checking qualification context at the end, teams can keep references available where weld and inspection work is planned and reviewed.',
    recordsH2: 'Typical WPQ workflow records',
    image: '/assets/images/marketing/inspectors-onsite.jpg',
    imageAlt: 'QA/QC team reviewing welder qualification and project documentation',
    tags: [['WPQ', '/iso-9606-1'], ['WPS', '/iso-15609'], ['ISO 3834', '/iso-3834'], ['Inspections', '/inspections'], ['EN 1090', '/en-1090'], ['Reports', '/reports']],
    intentCards: [
      ['Welder context', 'Keep qualification references easier to find near project work.'],
      ['WPS links', 'Connect qualification context with procedure references.'],
      ['Inspection review', 'Support inspection and handover review with connected records.'],
      ['Dossier preparation', 'Bring qualification references into project documentation workflows.'],
    ],
    workflowBullets: ['Welder and qualification context can be linked to project records.', 'WPS and WPQ references can be reviewed together.', 'Inspection evidence remains connected to weld records.', 'Reports can include relevant documentation references for review.'],
    records: [['Welder context', 'Names, references and qualification context.'], ['Qualifications', 'WPQ records and supporting files.'], ['Procedures', 'WPS links and document references.'], ['Welds', 'Weld records tied to execution context.'], ['Inspections', 'Findings and evidence around weld work.'], ['Reports', 'Structured output for handover.']],
    related: [['WPS software', 'Procedure reference workflows.', '/iso-15609'], ['ISO 3834', 'Welding quality documentation context.', '/iso-3834'], ['Inspection software', 'Capture inspection records and evidence.', '/inspections'], ['Demo', 'Review qualification workflows.', '/demo']],
  },
  {
    file: 'en-10204.html',
    canonical: '/en-10204',
    shortName: 'EN 10204 material traceability',
    title: 'Material Traceability Software for EN 10204 Certificates | WeldInspect Pro',
    description: 'Material traceability software for EN 10204 certificate context, heat numbers, weld records, inspection evidence and steel project documentation.',
    kicker: 'Material traceability software',
    h1: 'Material traceability software for certificates, heat numbers and weld documentation.',
    lead: 'WeldInspect Pro helps teams link material certificates, heat numbers, weld records, inspections and project documents so traceability evidence stays visible during fabrication and handover.',
    safeH2: 'Support material certificate workflows while official documents remain leading.',
    intentH2: 'What teams need from material traceability software',
    intentIntro: 'Traceability depends on knowing which material information belongs to which project, weld, certificate and report. WeldInspect Pro keeps that context connected.',
    workflowH2: 'Connect certificates and heat numbers to project evidence',
    workflowIntro: 'Material evidence is easier to review when it is attached to the project and weld context instead of stored as separate PDFs without workflow status.',
    recordsH2: 'Typical material traceability workflow records',
    image: '/assets/images/marketing/mobile-inspection.jpg',
    imageAlt: 'Inspector reviewing material traceability evidence on a tablet',
    tags: [['EN 10204', '/en-10204'], ['EN 1090', '/en-1090'], ['ISO 3834', '/iso-3834'], ['Inspections', '/inspections'], ['Reports', '/reports'], ['Platform', '/platform']],
    intentCards: [
      ['Material certificates', 'Keep certificates findable by project, material and supporting evidence context.'],
      ['Heat numbers', 'Connect heat number references to the records they support.'],
      ['Weld records', 'Keep material context near weld and inspection evidence.'],
      ['Handover output', 'Prepare traceability review with less file chasing.'],
    ],
    workflowBullets: ['Certificates and material references are linked to project context.', 'Heat numbers can remain visible in traceability evidence.', 'Inspection and material evidence can be reviewed together.', 'Reports can support clearer handover conversations.'],
    records: [['Certificates', 'Material certificates and supporting files.'], ['Heat numbers', 'Traceability references in project context.'], ['Welds', 'Weld records linked to material information.'], ['Inspections', 'Evidence and findings connected to the work.'], ['Documents', 'Drawings, reports and certificate attachments.'], ['Handover', 'Structured output for review.']],
    related: [['EN 1090', 'Connect traceability to CE documentation workflows.', '/en-1090'], ['Reports', 'Prepare traceability output.', '/reports'], ['Platform', 'See document and evidence modules.', '/platform'], ['Contact', 'Discuss material traceability needs.', '/contact']],
  },
];

function pricingPage() {
  const faq = [
    ['Is pricing shown as a starting point?', 'Yes. The pricing page gives evaluation routes for small teams, growing QA/QC workflows and larger organisations. Final scope can depend on team size and implementation needs.'],
    ['Can we start with a trial before choosing a plan?', 'Yes. Teams can request trial access or book a demo to review projects, welds, inspections, WPS/WPQ, evidence and documentation workflows.'],
    ['Does the software guarantee compliance?', 'No. WeldInspect Pro supports documentation workflows. Official standard texts, certification and formal conformity decisions remain leading.'],
  ];
  return pageShell({
    title: 'WeldInspect Pro Pricing | Weld Inspection Software Plans and Demo',
    description: 'Review WeldInspect Pro pricing routes for weld inspection software, EN 1090 documentation, CE dossier workflows, WPS/WPQ context, traceability and reporting.',
    canonical: '/pricing',
    image: '/assets/images/marketing/report-preview.jpg',
    schema: [faqSchema(faq)],
  }, `<section class="route-hero"><div class="container route-hero-grid"><div><p class="kicker">Pricing</p><h1>Pricing for weld inspection software, documentation and traceability workflows.</h1><p class="lead">Choose the evaluation route that fits your team: trial access for hands-on review, a product demo for workflow mapping, or a sales conversation for multi-team documentation needs.</p><div class="hero-actions"><a class="btn btn-primary btn-large" href="/trial">Start free trial</a><a class="btn btn-outline btn-large" href="/demo">Book a demo</a></div></div><div class="route-hero-media"><img src="/assets/images/marketing/report-preview.jpg" alt="WeldInspect Pro pricing and reporting workflow"><div class="media-card">${productMockup}</div></div></div></section>
<section class="section"><div class="container"><div class="section-head"><span class="kicker">Plans</span><h2>Simple routes for different welding documentation teams</h2><p>Pricing should be easy to understand, but welding documentation workflows are not always identical. These routes help teams choose the right next step without hiding the practical implementation conversation.</p></div><div class="pricing-cards"><article class="pricing-card"><span>Starter</span><h3>Trial evaluation</h3><p>For small teams reviewing digital weld inspection, photo evidence and basic documentation workflows.</p><ul class="check-list"><li>Project and weld workflow review</li><li>Inspection and evidence capture</li><li>Trial access request route</li></ul><a class="btn btn-outline" href="/trial">Start Free Trial</a></article><article class="pricing-card featured"><span>Professional</span><h3>Demo-led setup</h3><p>For QA/QC teams that want to map EN 1090, ISO 3834, WPS/WPQ and dossier workflows before rollout.</p><ul class="check-list"><li>Workflow demo for projects and welds</li><li>WPS/WPQ and document context</li><li>Reporting and handover discussion</li></ul><a class="btn btn-primary" href="/demo">Book a Demo</a></article><article class="pricing-card"><span>Enterprise</span><h3>Custom conversation</h3><p>For larger organisations with multiple teams, project documentation roles or broader traceability requirements.</p><ul class="check-list"><li>Multi-team workflow review</li><li>Security and access discussion</li><li>Implementation scope alignment</li></ul><a class="btn btn-outline" href="/contact">Contact Sales</a></article></div></div></section>
<section class="section section-alt"><div class="container"><div class="section-head"><span class="kicker">What affects scope</span><h2>What to consider before choosing a plan</h2></div><div class="visual-card-grid"><article class="visual-card"><span>01</span><h3>Number of projects</h3><p>Teams running many parallel steel projects may need stronger project templates, role separation and reporting routines.</p></article><article class="visual-card"><span>02</span><h3>Inspection workflow depth</h3><p>Visual checks, findings, photo evidence, open actions and review status can be phased in based on team maturity.</p></article><article class="visual-card"><span>03</span><h3>Documentation scope</h3><p>EN 1090, ISO 3834, WPS/WPQ, material traceability and CE dossier needs affect the best rollout path.</p></article><article class="visual-card"><span>04</span><h3>Handover expectations</h3><p>Teams that need structured reports and dossier readiness benefit from mapping output requirements early.</p></article></div></div></section>
<section class="section"><div class="container"><div class="section-head"><span class="kicker">FAQ</span><h2>Pricing questions</h2></div><div class="route-panel">${faq.map(([q, a]) => `<article class="route-card"><h3>${q}</h3><p>${a}</p></article>`).join('')}</div></div></section>${finalCta()}`);
}

function corePage(data) {
  const faq = [
    [`Who is ${data.shortName} for?`, data.faqAudience],
    [`How does ${data.shortName} connect to other workflows?`, data.faqWorkflow],
    ['Does WeldInspect Pro guarantee compliance?', 'No. WeldInspect Pro supports documentation workflows around relevant standards. Official standard texts, certification and formal conformity decisions remain leading.'],
  ];
  return pageShell({
    title: data.title,
    description: data.description,
    canonical: data.canonical,
    image: data.image,
    schema: [faqSchema(faq)],
  }, `<section class="route-hero"><div class="container route-hero-grid"><div><p class="kicker">${data.kicker}</p><h1>${data.h1}</h1><p class="lead">${data.lead}</p><div class="hero-actions"><a class="btn btn-primary btn-large" href="/trial">Start free trial</a><a class="btn btn-outline btn-large" href="/demo">Book a demo</a></div></div><div class="route-hero-media"><img src="${data.image}" alt="${data.imageAlt}"><div class="media-card">${productMockup}</div></div></div></section>
<section class="section"><div class="container"><div class="section-head"><span class="kicker">SEO workflow overview</span><h2>${data.overviewH2}</h2><p>${data.overview}</p></div><div class="visual-card-grid">${data.cards.map(([h, p], i) => `<article class="visual-card"><span>${String(i + 1).padStart(2, '0')}</span><h3>${h}</h3><p>${p}</p></article>`).join('')}</div></div></section>
<section class="section section-alt"><div class="container visual-split"><div><span class="kicker">Product detail</span><h2>${data.detailH2}</h2><p>${data.detail}</p><ul class="check-list">${data.bullets.map((item) => `<li>${item}</li>`).join('')}</ul></div><img src="/assets/images/marketing/mobile-inspection.jpg" alt="WeldInspect Pro workflow on a tablet"></div></section>
<section class="section"><div class="container"><div class="section-head"><span class="kicker">Related pages</span><h2>Continue through the connected WeldInspect Pro workflow</h2></div><div class="seo-link-grid">${data.related.map(([label, text, href]) => `<a href="${href}">${label}<small>${text}</small></a>`).join('')}</div></div></section>
<section class="section section-alt"><div class="container"><div class="section-head"><span class="kicker">FAQ</span><h2>${data.shortName} questions</h2></div><div class="route-panel">${faq.map(([q, a]) => `<article class="route-card"><h3>${q}</h3><p>${a}</p></article>`).join('')}</div></div></section>${finalCta()}`);
}

function enrichCorePage(file, sections) {
  const html = String(sections);
  const current = files[file] ?? '';
  const marker = '<section class="final-cta visual-cta">';
  if (!current.includes(marker)) return current;
  return current.replace(marker, `${html}${marker}`);
}

function write(file, html) {
  writeFileSync(join(root, file), html.replace(/\n\s+\n/g, '\n'), 'utf8');
}

const files = {};

for (const page of standardPages) {
  write(page.file, standardPage(page));
}
write('pricing.html', pricingPage());

const corePages = [
  {
    file: 'platform.html',
    canonical: '/platform',
    shortName: 'the WeldInspect Pro platform',
    title: 'Weld Inspection Software Platform for Projects, Welds and CE Documentation',
    description: 'Weld inspection software platform for project control, weld registers, inspections, WPS/WPQ, material traceability, documents, CE dossiers and reporting.',
    kicker: 'Weld inspection software platform',
    h1: 'Weld inspection software platform for projects, welds, inspections and documentation.',
    lead: 'WeldInspect Pro connects project setup, weld registers, inspection evidence, WPS/WPQ references, documents, material traceability and reporting in one controlled workflow.',
    overviewH2: 'One platform for the complete welding documentation workflow',
    overview: 'The platform page targets teams searching for a central system to replace disconnected spreadsheets, folders, photos and manual dossier preparation.',
    detailH2: 'Connect the shop floor, QA/QC and documentation team',
    detail: 'Every module is designed around a practical project workflow: plan the project, register welds, inspect work, attach evidence, review open actions and prepare handover output.',
    image: '/assets/images/marketing/photo-inspector-tablet.jpg',
    imageAlt: 'Inspector using WeldInspect Pro for project documentation',
    cards: [['Projects', 'Organise project scope, roles, documents and review context.'], ['Weld register', 'Use weld records as the anchor for status, evidence and traceability.'], ['Inspections', 'Capture visual checks, findings, photos and follow-up.'], ['Documents', 'Link certificates, drawings, reports and evidence to the right project.']],
    bullets: ['Project, weld and inspection records stay visible together.', 'WPS/WPQ and material certificates can support the same project context.', 'Open actions and report readiness are easier to review.', 'Handover output is built from connected records.'],
    related: [['Inspections', 'See inspection evidence capture.', '/inspections'], ['Reports', 'Review dossier and handover output.', '/reports'], ['EN 1090', 'Explore EN 1090 documentation workflows.', '/en-1090'], ['Pricing', 'Choose an evaluation route.', '/pricing']],
    faqAudience: 'It is for steel construction, welding coordination, QA/QC, inspection coordination and project documentation teams that need connected records.',
    faqWorkflow: 'Projects, welds, inspections, WPS/WPQ, documents, material traceability and reports all reference the same project context.',
  },
  {
    file: 'inspections.html',
    canonical: '/inspections',
    shortName: 'weld inspection software',
    title: 'Weld Inspection Software for Findings, Photos and QA/QC Evidence',
    description: 'Weld inspection software for visual checks, findings, photo evidence, open actions, WPS/WPQ context, traceability and reporting workflows.',
    kicker: 'Weld inspection software',
    h1: 'Weld inspection software for findings, photo evidence and QA/QC follow-up.',
    lead: 'Capture inspection results, evidence, comments and open actions against the right weld record instead of losing context in paper forms, folders and chat messages.',
    overviewH2: 'Structured inspection records instead of scattered notes',
    overview: 'Inspection teams need fast capture, clear status and evidence that remains connected to project documentation. This page targets that practical search intent.',
    detailH2: 'Record inspection work where the evidence belongs',
    detail: 'WeldInspect Pro keeps visual inspection results, photos, comments and open actions tied to the project, weld and documentation context.',
    image: '/assets/images/marketing/mobile-inspection.jpg',
    imageAlt: 'Weld inspection evidence captured on a tablet',
    cards: [['Visual inspection', 'Record result states, comments and findings.'], ['Photo evidence', 'Attach photos to the relevant weld or finding.'], ['Open actions', 'Track follow-up from issue to review.'], ['Reporting', 'Use inspection data in handover output.']],
    bullets: ['Evidence is linked to weld records.', 'Inspection status stays visible to QA/QC teams.', 'Findings can be followed up before delivery.', 'Reports can be prepared from structured records.'],
    related: [['ISO 5817', 'Weld quality inspection context.', '/iso-5817'], ['Reports', 'Turn evidence into output.', '/reports'], ['Platform', 'See the full workflow.', '/platform'], ['Demo', 'Review inspection workflows.', '/demo']],
    faqAudience: 'It is for inspectors, QA/QC managers, welding coordinators and documentation teams working with weld evidence and follow-up.',
    faqWorkflow: 'Inspection records connect to projects, welds, WPS/WPQ references, photos, documents and reports.',
  },
  {
    file: 'reports.html',
    canonical: '/reports',
    shortName: 'welding reports and CE dossier software',
    title: 'Welding Reports and CE Dossier Software for Project Handover',
    description: 'Welding reports and CE dossier software for connected inspection evidence, documents, material traceability, WPS/WPQ context and project handover.',
    kicker: 'Reports and CE dossier software',
    h1: 'Welding reports and CE dossier software for evidence-based handover.',
    lead: 'Build reporting and dossier readiness from structured project, weld, inspection, document and traceability records while the work is still active.',
    overviewH2: 'Reporting should be assembled from real project records',
    overview: 'Teams searching for welding reports or CE dossier software usually want less manual copy-paste and fewer missing documents at the end of the project.',
    detailH2: 'Prepare handover before delivery pressure peaks',
    detail: 'WeldInspect Pro helps teams review report readiness, evidence completeness and document context during execution rather than after fabrication is finished.',
    image: '/assets/images/marketing/report-preview.jpg',
    imageAlt: 'WeldInspect Pro report preview for project handover',
    cards: [['Report readiness', 'See what evidence is available and what still needs attention.'], ['CE dossier context', 'Keep documents and evidence connected to project records.'], ['Traceability', 'Include material and certificate references where needed.'], ['Review output', 'Support clearer internal and external review conversations.']],
    bullets: ['Reports use structured project and inspection data.', 'Photos, documents and certificates stay attached to context.', 'Open points can be handled before handover.', 'Official decisions remain outside the software.'],
    related: [['EN 1090', 'Connect CE dossier work to EN 1090 workflows.', '/en-1090'], ['Material traceability', 'Review certificate context.', '/en-10204'], ['Inspections', 'Capture evidence at source.', '/inspections'], ['Contact', 'Discuss reporting needs.', '/contact']],
    faqAudience: 'It is for QA/QC managers, documentation teams and project teams preparing handover, review and dossier output.',
    faqWorkflow: 'Reports connect project data, welds, inspections, photos, documents, certificates and traceability evidence.',
  },
  {
    file: 'resources.html',
    canonical: '/resources',
    shortName: 'the WeldInspect Pro resources hub',
    title: 'Weld Inspection Resources for EN 1090, ISO 3834, WPS/WPQ and CE Dossiers',
    description: 'Weld inspection resources for EN 1090, ISO 3834, ISO 5817, WPS/WPQ, material traceability, CE dossiers, reporting and QA/QC workflows.',
    kicker: 'Knowledge hub',
    h1: 'Weld inspection resources for standards, evidence, traceability and dossier workflows.',
    lead: 'Use the resources hub to navigate practical guidance around weld inspection, EN 1090 documentation, ISO 3834 quality workflows, WPS/WPQ context and CE dossier preparation.',
    overviewH2: 'A knowledge hub built around real search intent',
    overview: 'Instead of thin link lists, the resources page now provides a clearer information architecture for standards, inspection evidence, reporting and traceability topics.',
    detailH2: 'Connect guidance to product workflows',
    detail: 'Every resource category links back to a product workflow so visitors can move from learning to evaluation without getting lost.',
    image: '/assets/images/marketing/inspectors-onsite.jpg',
    imageAlt: 'QA/QC team reviewing weld inspection resources',
    cards: [['Standards', 'EN 1090, ISO 3834, ISO 5817 and related documentation context.'], ['Inspection evidence', 'Guidance for findings, photos and follow-up.'], ['Traceability', 'Material certificates and heat number context.'], ['Dossier handover', 'Reporting and CE dossier preparation workflows.']],
    bullets: ['Clear categories for visitors and search engines.', 'Visible internal links to core product pages.', 'Safe standards language without unsupported claims.', 'FAQ and structured content for richer snippets.'],
    related: [['Standards', 'Browse standards-oriented workflows.', '/standards'], ['Platform', 'See the product modules.', '/platform'], ['Reports', 'Learn about handover output.', '/reports'], ['Trial', 'Evaluate the workflow.', '/trial']],
    faqAudience: 'It is for visitors researching weld inspection software, standards documentation, QA/QC workflows and dossier preparation.',
    faqWorkflow: 'Resources link to the platform, inspections, reports, standards pages and conversion routes.',
  },
  {
    file: 'use-cases.html',
    canonical: '/use-cases',
    shortName: 'WeldInspect Pro use cases',
    title: 'Weld Inspection Software Use Cases for Steel Fabricators and QA/QC Teams',
    description: 'Use cases for weld inspection software across steel fabricators, QA/QC managers, welding coordinators, inspection coordinators and documentation teams.',
    kicker: 'Use cases',
    h1: 'Weld inspection software use cases for every role in the documentation workflow.',
    lead: 'See how steel fabricators, QA/QC managers, welding coordinators, inspection coordinators and documentation teams use connected project records.',
    overviewH2: 'Role-based workflows make the product easier to understand',
    overview: 'Search visitors often want to know whether the software fits their role. This page maps practical responsibilities to product workflows.',
    detailH2: 'From production records to project handover',
    detail: 'Each role can work with the same project context while focusing on the information they need most.',
    image: '/assets/images/marketing/inspectors-onsite.jpg',
    imageAlt: 'Team reviewing weld inspection use cases',
    cards: [['Steel fabricator', 'Keep production and documentation work aligned.'], ['QA/QC manager', 'See quality status, evidence and open actions.'], ['Welding coordinator', 'Manage WPS/WPQ and procedure context.'], ['Documentation team', 'Prepare dossier and handover output.']],
    bullets: ['Shared project records reduce duplicate work.', 'Inspection evidence remains linked to welds.', 'Document status is easier to review.', 'Handover preparation starts earlier.'],
    related: [['Platform', 'See the full product workflow.', '/platform'], ['Inspections', 'Review evidence capture.', '/inspections'], ['Reports', 'Explore handover output.', '/reports'], ['Demo', 'Map your own use case.', '/demo']],
    faqAudience: 'It is for steel fabrication and welding documentation roles that need clearer project, inspection and dossier visibility.',
    faqWorkflow: 'Use cases connect role needs to projects, welds, inspections, WPS/WPQ, traceability and reports.',
  },
  {
    file: 'case-studies.html',
    canonical: '/case-studies',
    shortName: 'workflow scenarios',
    title: 'Weld Inspection Workflow Scenarios Without Fictional Customer Claims',
    description: 'Scenario-based weld inspection workflow examples for evidence capture, EN 1090 documentation, CE dossier preparation, traceability and reporting.',
    kicker: 'Workflow scenarios',
    h1: 'Weld inspection workflow scenarios without fictional customer claims.',
    lead: 'Explore practical project situations around inspection evidence, dossier preparation and handover without fake customer logos, fake testimonials or unsupported claims.',
    overviewH2: 'Practical scenarios explain the product without pretending to be customer proof',
    overview: 'This page supports search intent around examples and case studies while staying honest: scenarios are workflow examples, not fabricated customer stories.',
    detailH2: 'Use scenarios to understand where the platform helps',
    detail: 'Each scenario shows how records connect across project setup, weld inspection, WPS/WPQ context, traceability and reporting.',
    image: '/assets/images/marketing/photo-weld-closeup.jpg',
    imageAlt: 'Weld inspection workflow scenario',
    cards: [['Scattered evidence', 'Photos, notes and documents are brought into one project context.'], ['Open actions', 'Findings are tracked through review and completion.'], ['Dossier pressure', 'Handover output is prepared during execution.'], ['Traceability review', 'Certificates and heat numbers remain connected to project records.']],
    bullets: ['No fake testimonials or logos are used.', 'Examples stay focused on realistic workflows.', 'Internal links guide visitors to product pages.', 'Safe standards wording is maintained.'],
    related: [['Use cases', 'See role-based workflows.', '/use-cases'], ['Reports', 'Review dossier output.', '/reports'], ['EN 1090', 'Explore documentation context.', '/en-1090'], ['Contact', 'Discuss a project scenario.', '/contact']],
    faqAudience: 'It is for visitors who want concrete examples of how the platform supports weld inspection and documentation work.',
    faqWorkflow: 'Scenarios connect evidence capture, open actions, traceability, standards context and reporting.',
  },
];

for (const page of corePages) {
  write(page.file, corePage(page));
}

for (const [source, target] of [
  ['en-1090.html', 'en-1090/index.html'],
  ['iso-3834.html', 'iso-3834/index.html'],
  ['iso-5817.html', 'iso-5817/index.html'],
  ['iso-15609.html', 'iso-15609/index.html'],
  ['iso-9606-1.html', 'iso-9606-1/index.html'],
  ['en-10204.html', 'en-10204/index.html'],
  ['pricing.html', 'pricing/index.html'],
  ['platform.html', 'platform/index.html'],
  ['inspections.html', 'inspections/index.html'],
  ['reports.html', 'reports/index.html'],
  ['resources.html', 'resources/index.html'],
  ['use-cases.html', 'use-cases/index.html'],
  ['case-studies.html', 'case-studies/index.html'],
]) {
  mkdirSync(dirname(join(root, target)), { recursive: true });
  copyFileSync(join(root, source), join(root, target));
}

console.log(`Enhanced ${standardPages.length} standard pages and pricing SEO content.`);
