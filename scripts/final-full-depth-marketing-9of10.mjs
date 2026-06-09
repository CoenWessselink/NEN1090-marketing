import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function walk(dir = root) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '.git' || entry === 'node_modules') continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (entry.endsWith('.html')) files.push(path);
  }
  return files;
}

const replacements = new Map([
  ['A route-specific workflow view shows where teams capture, review and hand over the relevant records.', 'Project records, inspection evidence and handover status remain connected throughout the work.'],
  ['Een routespecifieke workflow laat zien waar teams records vastleggen, beoordelen en overdragen.', 'Projectrecords, inspectiebewijs en overdrachtsstatus blijven tijdens het werk met elkaar verbonden.'],
  ['Deeper context for this workflow.', 'Explore how this topic connects inspection records, evidence, documents and handover.'],
  ['Verdieping binnen dit werkproces.', 'Bekijk de praktische relatie met inspectie, bewijs, documenten en overdracht.'],
  ['Lees hoe dit onderwerp terugkomt in projecten, inspecties, bewijs en overdracht.', 'Bekijk de praktische relatie met projecten, inspecties, bewijs en overdracht.'],
  ['\u00e2\u20ac\u00a2', '&bull;'],
  ['\u00e2\u0153\u201c', '&#10003;'],
  ['\u00c3\u201a\u00c2\u00b7', '&middot;'],
  ['\u00c3\u201a\u00b7', '&middot;'],
  ['Digitale werkprocess voor', 'Digitaal werkproces voor'],
  ['CE-dossieropbouwen', 'CE-dossieropbouw'],
]);

function dutchSeoDescription(relative) {
  const special = new Map([
    ['nl/index.html', 'WeldInspect Pro Nederland: software voor lasinspectie, EN 1090-documentatie, materiaaltraceerbaarheid en CE-dossieropbouw.'],
    ['nl/contact.html', 'Neem contact op met WeldInspect Pro over lasinspectie, projectdocumentatie, een demo, proefperiode of implementatie.'],
    ['nl/demo.html', 'Plan een WeldInspect Pro-demo rond projecten, lassen, inspecties, WPS/WPQ, bewijs, rapportage en dossieropbouw.'],
    ['nl/trial.html', 'Vraag een proefperiode aan en beoordeel projecten, lassen, inspecties, bewijs, rapportage en dossieropbouw in WeldInspect Pro.'],
    ['nl/prijzen.html', 'Bekijk prijzen en evaluatieroutes voor WeldInspect Pro, met proefperiode, demo, maandplan, jaarplan en maatwerk.'],
  ]);
  if (special.has(relative)) return special.get(relative);
  const parts = relative.replace(/\/index\.html$/, '').replace(/\.html$/, '').split('/');
  const slug = parts.at(-1) || 'WeldInspect Pro';
  const acronyms = new Map([
    ['en', 'EN'], ['iso', 'ISO'], ['wps', 'WPS'], ['wpq', 'WPQ'], ['ce', 'CE'],
    ['qa', 'QA'], ['qc', 'QC'], ['exc', 'EXC'], ['ndo', 'NDO']
  ]);
  const subject = slug.split('-').map((word, index) => {
    const value = acronyms.get(word.toLowerCase()) || word;
    return index === 0 && !acronyms.has(word.toLowerCase())
      ? `${value.charAt(0).toUpperCase()}${value.slice(1)}`
      : value;
  }).join(' ');
  return `${subject}: praktische uitleg over lasinspectie, bewijs, projectdocumentatie en overdracht met WeldInspect Pro.`;
}

function photographySection({ lang, image, image480, image768, heading, copy, bullets, cta, href, alt }) {
  const kicker = lang === 'nl' ? 'Werkvloer en software verbonden' : 'Shop floor and software connected';
  return `<!-- final-depth:start:field-photography --><section class="section field-context"><div class="container field-context-grid"><picture class="field-context-media"><source srcset="${image480} 480w, ${image768} 768w, ${image} 1360w" sizes="(max-width: 820px) calc(100vw - 32px), 56vw" type="image/webp"><img src="${image}" alt="${alt}" width="1360" height="765" loading="lazy" decoding="async"></picture><div class="field-context-copy"><span class="kicker">${kicker}</span><h2>${heading}</h2><p>${copy}</p><ul>${bullets.map((item) => `<li>${item}</li>`).join('')}</ul><a class="btn btn-outline" href="${href}">${cta}</a></div></div></section><!-- final-depth:end:field-photography -->`;
}

function knowledgeHub(lang) {
  const nl = lang === 'nl';
  const cards = nl
    ? [
      ['Lasinspectie', 'Lasinspecties digitaal vastleggen', '/nl/lasinspectie-software', 'Lees hoe bevindingen, foto&rsquo;s en open punten direct bij de juiste las blijven.'],
      ['EN 1090', 'EN 1090-documentatie beter organiseren', '/nl/en-1090-software', 'Bekijk hoe projectdocumentatie rondom EN 1090 overzichtelijk kan worden opgebouwd.'],
      ['CE-dossier', 'CE-dossier opbouwen tijdens uitvoering', '/nl/ce-dossier-software', 'Leer welke dossierinformatie al tijdens uitvoering beter kan worden verzameld.'],
      ['WPS/WPQ', 'Procedure- en kwalificatiecontext koppelen', '/nl/wps-wpq-beheer', 'Zie hoe WPS/WPQ-context bij lasrecords vindbaar blijft tijdens inspectie en beoordeling.'],
      ['Materiaaltraceerbaarheid', 'Certificaten en materiaalbewijs verbinden', '/nl/materiaaltraceerbaarheid', 'Koppel certificaten, heatnummers en batchinformatie aan het juiste projectbewijs.'],
      ['Rapportage en overdracht', 'Van inspectierecord naar bruikbare overdracht', '/nl/blog/', 'Maak inspectieresultaten en documenten begrijpelijk voor beoordeling en oplevering.']
    ]
    : [
      ['Weld inspection', 'Keep field findings attached to the weld', '/inspections', 'Connect findings, photos and open actions to the correct weld and project record.'],
      ['EN 1090', 'Organise standards-oriented project records', '/standards', 'Build clearer documentation context while official texts and qualified review remain leading.'],
      ['CE dossier', 'Prepare evidence before handover pressure', '/reports', 'Review missing evidence and dossier status while the project is still active.'],
      ['WPS/WPQ', 'Keep procedure context close to weld records', '/platform', 'Make procedure and qualification references easier to find during inspection and review.'],
      ['Material traceability', 'Connect certificates, heats and project evidence', '/en-10204', 'Follow material context from certificate and batch information into project documentation.'],
      ['Reporting and handover', 'Turn connected records into structured output', '/reports', 'Prepare reports and handover from project, weld, inspection and evidence records.']
    ];
  return `<!-- final9:start:hub-${lang} --><section class="completion-band premium-knowledge"><div class="container"><div class="section-head"><span class="kicker">${nl ? 'Kenniscentrum' : 'Knowledge hub'}</span><h2>${nl ? 'Praktische kennis voor lasinspectie en dossieropbouw.' : 'Practical guidance for weld inspection and documentation teams.'}</h2><p>${nl ? 'Elke route behandelt een concreet onderdeel van inspectie, bewijs, documentatie of overdracht.' : 'Each route covers a concrete part of inspection, evidence, documentation or handover.'}</p></div><div class="knowledge-grid">${cards.map(([category, title, href, description]) => `<a class="knowledge-card" href="${href}"><span>${category}</span><h3>${title}</h3><p>${description}</p></a>`).join('')}</div></div></section><!-- final9:end:hub-${lang} -->`;
}

const sections = new Map([
  ['inspections.html', photographySection({
    lang: 'en',
    image: '/assets/images/marketing/optimized/workshop-inspector-tablet-1360.webp',
    image480: '/assets/images/marketing/optimized/workshop-inspector-tablet-480.webp',
    image768: '/assets/images/marketing/optimized/workshop-inspector-tablet-768.webp',
    heading: 'Capture inspection context while the work is still visible.',
    copy: 'WeldInspect Pro helps field and office teams work from the same project record. An inspector can record findings and evidence on the shop floor; QA/QC can review that context later without reconstructing it from separate folders.',
    bullets: ['Findings and photos linked to the correct weld', 'Open actions visible to the responsible team', 'Project context retained for review and handover'],
    cta: 'See the guided product demo',
    href: '/demo',
    alt: 'Inspector using WeldInspect Pro on a tablet in a steel fabrication workshop'
  })],
  ['demo.html', photographySection({
    lang: 'en',
    image: '/assets/images/marketing/optimized/workshop-weldinspect-pro-1360.webp',
    image480: '/assets/images/marketing/optimized/workshop-weldinspect-pro-480.webp',
    image768: '/assets/images/marketing/optimized/workshop-weldinspect-pro-768.webp',
    heading: 'Review the product in the setting it is built for.',
    copy: 'A guided demo connects the screens to practical steel construction questions: who records the work, where evidence belongs, what still needs review and how the project moves toward handover.',
    bullets: ['Use your own project and stakeholder questions', 'Review inspection, evidence and reporting together', 'Choose trial, pricing or implementation follow-up afterwards'],
    cta: 'Start a product evaluation',
    href: '/trial',
    alt: 'WeldInspect Pro user reviewing project records on a tablet in a steel workshop'
  })],
  ['nl/lasinspectie-software.html', photographySection({
    lang: 'nl',
    image: '/assets/images/marketing/optimized/workshop-inspector-tablet-1360.webp',
    image480: '/assets/images/marketing/optimized/workshop-inspector-tablet-480.webp',
    image768: '/assets/images/marketing/optimized/workshop-inspector-tablet-768.webp',
    heading: 'Leg inspectiecontext vast terwijl het werk nog zichtbaar is.',
    copy: 'WeldInspect Pro laat werkvloer en kantoor vanuit hetzelfde projectrecord werken. Een inspecteur legt bevindingen en bewijs vast; QA/QC beoordeelt later dezelfde context zonder losse mappen en gesprekken te reconstrueren.',
    bullets: ['Bevindingen en foto&rsquo;s bij de juiste las', 'Open acties zichtbaar voor het verantwoordelijke team', 'Projectcontext behouden voor beoordeling en overdracht'],
    cta: 'Bekijk de productdemo',
    href: '/nl/demo',
    alt: 'Inspecteur gebruikt WeldInspect Pro op een tablet in een staalbouwwerkplaats'
  })],
  ['nl/demo.html', photographySection({
    lang: 'nl',
    image: '/assets/images/marketing/optimized/workshop-weldinspect-pro-1360.webp',
    image480: '/assets/images/marketing/optimized/workshop-weldinspect-pro-480.webp',
    image768: '/assets/images/marketing/optimized/workshop-weldinspect-pro-768.webp',
    heading: 'Bekijk het product in de praktijk waarvoor het is gemaakt.',
    copy: 'Een begeleide demo koppelt de schermen aan concrete staalbouwvragen: wie registreert het werk, waar hoort bewijs, wat moet nog worden beoordeeld en hoe groeit het project naar overdracht.',
    bullets: ['Gebruik uw eigen project- en stakeholdervragen', 'Bekijk inspectie, bewijs en rapportage in samenhang', 'Kies daarna proefperiode, prijsroute of implementatieoverleg'],
    cta: 'Start een productevaluatie',
    href: '/nl/trial',
    alt: 'Gebruiker beoordeelt WeldInspect Pro projectrecords op een tablet in een staalbouwwerkplaats'
  })],
]);

for (const file of walk()) {
  let html = readFileSync(file, 'utf8');
  for (const [bad, good] of replacements) html = html.split(bad).join(good);
  html = html
    .replace(/<!-- final-depth:start:field-photography -->[\s\S]*?<!-- final-depth:end:field-photography -->/g, '')
    .replace(/<video(?![^>]*aria-label)/g, '<video aria-label="WeldInspect Pro product tour"')
    .replace(/<video([^>]*)controls([^>]*)>/g, '<video$1controls$2 playsinline>');
  const relative = file.slice(root.length + 1).replaceAll('\\', '/');
  if (relative.startsWith('nl/')) {
    const currentDescription = html.match(/<meta name="description" content="([^"]*)">/i)?.[1];
    if (currentDescription && (/\. voor lasinspectie/i.test(currentDescription) || /\.\. Praktische uitleg/i.test(currentDescription) || currentDescription.length > 170)) {
      const canonicalRelative = relative === 'nl/index.html' ? relative : relative.replace(/\/index\.html$/, '.html');
      const description = dutchSeoDescription(canonicalRelative);
      html = html.split(currentDescription).join(description);
    }
  }
  if (relative === 'resources.html' || relative === 'resources/index.html') {
    html = html.replace(/<!-- final9:start:hub-en -->[\s\S]*?<!-- final9:end:hub-en -->/, knowledgeHub('en'));
  }
  if (relative === 'nl/index.html' || relative === 'nl/blog/index.html') {
    html = html.replace(/<!-- final9:start:hub-nl -->[\s\S]*?<!-- final9:end:hub-nl -->/, knowledgeHub('nl'));
  }
  const section = sections.get(relative);
  if (section) {
    const marker = '<!-- final-trust:start -->';
    html = html.includes(marker)
      ? html.replace(marker, `${section}${marker}`)
      : html.replace('<section class="final-cta visual-cta">', `${section}<section class="final-cta visual-cta">`);
  }
  writeFileSync(file, html, 'utf8');
}

for (const [source, target] of [
  ['inspections.html', 'inspections/index.html'],
  ['demo.html', 'demo/index.html'],
  ['nl/lasinspectie-software.html', 'nl/lasinspectie-software/index.html'],
  ['nl/demo.html', 'nl/demo/index.html'],
]) {
  if (existsSync(join(root, source)) && existsSync(join(root, target))) {
    writeFileSync(join(root, target), readFileSync(join(root, source), 'utf8'), 'utf8');
  }
}

console.log(`Final full-depth cleanup applied to ${walk().length} HTML files.`);
