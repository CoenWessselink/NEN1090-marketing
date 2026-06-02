import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const root = process.cwd();
const skipDirs = new Set(['.git', 'node_modules']);

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    if (skipDirs.has(entry)) continue;
    const absolute = join(dir, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) files.push(...walk(absolute));
    else if (entry.endsWith('.html')) files.push(absolute.slice(root.length + 1).replaceAll('\\', '/'));
  }
  return files;
}

function esc(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function text(value) {
  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function titleFromFile(file) {
  const raw = basename(file, '.html') === 'index' ? basename(dirname(file)) : basename(file, '.html');
  return raw
    .replace(/[-_]+/g, ' ')
    .replace(/\bnl\b/gi, '')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || 'WeldInspect Pro';
}

function routeFromFile(file) {
  const normalized = file.replaceAll('\\', '/');
  if (normalized === 'index.html') return '/';
  if (normalized.endsWith('/index.html')) return `/${normalized.slice(0, -'/index.html'.length)}`;
  return `/${normalized}`;
}

function describe({ file, title, h1, lang }) {
  const topic = h1 || title || titleFromFile(file);
  if (lang === 'nl') {
    return `${topic} voor lasinspectie, EN 1090 documentatie, WPS/WPQ context, materiaaltraceerbaarheid, QA/QC workflows en CE dossieropbouw met WeldInspect Pro.`;
  }
  return `${topic} for weld inspection software, EN 1090 documentation, WPS/WPQ context, material traceability, QA/QC workflows, reporting and CE dossier preparation with WeldInspect Pro.`;
}

function h2Block(file, lang, topic) {
  if (lang === 'nl') {
    return `<section class="section seo-sitewide-support"><div class="container"><div class="section-head"><span class="kicker">SEO context</span><h2>${esc(topic)} in de WeldInspect Pro workflow</h2><p>Deze pagina hoort bij het bredere werkproces voor lasinspectie, kwaliteitscontrole, traceerbaarheid en dossieropbouw. WeldInspect Pro ondersteunt werkprocessen en documentatie rondom relevante normen; officiele normteksten, certificering en formele conformiteitsbesluiten blijven leidend.</p></div><div class="visual-card-grid"><article class="visual-card"><span>01</span><h3>Werkproces</h3><p>Projecten, lassen, inspecties en documenten blijven gekoppeld aan dezelfde context.</p></article><article class="visual-card"><span>02</span><h3>Documentatie</h3><p>Bewijs, certificaten en rapportage worden beter vindbaar tijdens voorbereiding en overdracht.</p></article></div><div class="section-head"><h2>Gerelateerde lasinspectie software pagina's</h2><p>Gebruik deze interne links om snel door te gaan naar de belangrijkste Nederlandse workflows.</p></div><div class="seo-link-grid"><a href="/nl/lasinspectie-software">Lasinspectie software<small>Digitale controles, bewijs en opvolging.</small></a><a href="/nl/en-1090-software">EN 1090 software<small>Projectdocumentatie en dossiercontext.</small></a><a href="/nl/ce-dossier-software">CE dossier software<small>Handover en documentatie workflows.</small></a><a href="/nl/contact">Contact<small>Bespreek uw workflow.</small></a></div></div></section>`;
  }
  return `<section class="section seo-sitewide-support"><div class="container"><div class="section-head"><span class="kicker">SEO context</span><h2>${esc(topic)} in the WeldInspect Pro workflow</h2><p>This page is part of the wider workflow for weld inspection, QA/QC, traceability, reporting and project documentation. WeldInspect Pro supports documentation workflows around relevant standards; official standard texts, certification and formal conformity decisions remain leading.</p></div><div class="visual-card-grid"><article class="visual-card"><span>01</span><h3>Workflow context</h3><p>Projects, welds, inspections and documents stay connected to the same documentation flow.</p></article><article class="visual-card"><span>02</span><h3>Documentation context</h3><p>Evidence, certificates and report output remain easier to find during preparation and handover.</p></article></div><div class="section-head"><h2>Related weld inspection software pages</h2><p>Use these internal links to continue through the main WeldInspect Pro workflows.</p></div><div class="seo-link-grid"><a href="/platform">Platform<small>Projects, welds and documents connected.</small></a><a href="/inspections">Inspections<small>Evidence, findings and follow-up.</small></a><a href="/standards">Standards<small>EN 1090, ISO 3834, WPS/WPQ and traceability.</small></a><a href="/reports">Reports<small>Reporting and dossier handover.</small></a></div></div></section>`;
}

function insertBeforeClose(html, block) {
  if (/<\/main>/i.test(html)) return html.replace(/<\/main>/i, `${block}</main>`);
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${block}</body>`);
  return `${html}${block}`;
}

function normalizeHead(html, meta) {
  let out = html;
  out = out
    .replace(/<script\s+async\s+src=["']https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"']+["']><\/script>\s*<script>[\s\S]*?gtag\('config'[\s\S]*?<\/script>/gi, '')
    .replace(/<link\s+rel=["']preconnect["']\s+href=["']https:\/\/fonts\.googleapis\.com["'][^>]*>\s*/gi, '')
    .replace(/<link\s+rel=["']preconnect["']\s+href=["']https:\/\/fonts\.gstatic\.com["'][^>]*>\s*/gi, '')
    .replace(/<link\s+href=["']https:\/\/fonts\.googleapis\.com\/[^"']+["']\s+rel=["']stylesheet["'][^>]*>\s*/gi, '');

  const titleTag = `<title>${esc(meta.title)}</title>`;
  if (/<title>[\s\S]*?<\/title>/i.test(out)) {
    out = out.replace(/<title>[\s\S]*?<\/title>/i, titleTag);
  } else {
    out = out.replace(/<head[^>]*>/i, (m) => `${m}\n${titleTag}`);
  }

  const descTag = `<meta name="description" content="${esc(meta.description)}">`;
  if (/<meta\s+name=["']description["'][^>]*>/i.test(out)) {
    out = out.replace(/<meta\s+name=["']description["'][^>]*>/i, descTag);
  } else {
    out = out.replace(/<title>[\s\S]*?<\/title>/i, (m) => `${m}\n${descTag}`);
  }

  const canonicalTag = `<link rel="canonical" href="https://weldinspectpro.com${meta.route}">`;
  if (/<link\s+rel=["']canonical["'][^>]*>/i.test(out)) {
    out = out.replace(/<link\s+rel=["']canonical["'][^>]*>/i, canonicalTag);
  } else {
    out = out.replace(descTag, `${descTag}\n${canonicalTag}`);
  }

  const ogTags = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(meta.title)}">`,
    `<meta property="og:description" content="${esc(meta.description)}">`,
    `<meta property="og:url" content="https://weldinspectpro.com${meta.route}">`,
    `<meta property="og:image" content="https://weldinspectpro.com/assets/images/marketing/optimized/hero-welder-action.jpg">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].join('\n');

  const hasOg = /<meta\s+property=["']og:title["']/i.test(out) && /<meta\s+property=["']og:description["']/i.test(out);
  if (!hasOg) out = out.replace(canonicalTag, `${canonicalTag}\n${ogTags}`);
  else {
    out = out
      .replace(/<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${esc(meta.title)}">`)
      .replace(/<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${esc(meta.description)}">`);
    if (/<meta\s+property=["']og:url["'][^>]*>/i.test(out)) out = out.replace(/<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="https://weldinspectpro.com${meta.route}">`);
  }

  if (!/<script\s+type=["']application\/ld\+json["']>/i.test(out)) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: meta.title,
      description: meta.description,
      url: `https://weldinspectpro.com${meta.route}`,
      isPartOf: {
        '@type': 'WebSite',
        name: 'WeldInspect Pro',
        url: 'https://weldinspectpro.com/',
      },
    };
    out = out.replace(/<\/head>/i, `<script type="application/ld+json">${JSON.stringify(schema)}</script>\n</head>`);
  }
  return out;
}

let changed = 0;
for (const file of walk(root)) {
  let html = readFileSync(join(root, file), 'utf8');
  const lang = file.startsWith('nl/') || /<html[^>]+lang=["']nl/i.test(html) ? 'nl' : 'en';
  const currentTitle = text((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => text(m[1]));
  const topic = h1s[0] || currentTitle || titleFromFile(file);
  const desiredTitle = currentTitle.length >= 25 ? currentTitle : `${topic} | WeldInspect Pro`;
  const currentDesc = (html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)/i) || [])[1] || '';
  const desiredDesc = currentDesc.length >= 100 ? currentDesc : describe({ file, title: desiredTitle, h1: topic, lang });
  const route = routeFromFile(file);
  const before = html;

  html = normalizeHead(html, { title: desiredTitle, description: desiredDesc, route });

  if (h1s.length === 0) {
    const h1 = `<section class="section seo-sitewide-hero"><div class="container"><h1>${esc(topic)}</h1><p class="lead">${esc(desiredDesc)}</p></div></section>`;
    if (/<main[^>]*>/i.test(html)) html = html.replace(/<main[^>]*>/i, (m) => `${m}${h1}`);
    else if (/<body[^>]*>/i.test(html)) html = html.replace(/<body[^>]*>/i, (m) => `${m}${h1}`);
    else html = `${h1}${html}`;
  }

  const h2Count = (html.match(/<h2[\s>]/gi) || []).length;
  if (h2Count < 2) html = insertBeforeClose(html, h2Block(file, lang, topic));

  if (html !== before) {
    writeFileSync(join(root, file), html, 'utf8');
    changed += 1;
  }
}

console.log(`Sitewide SEO normalized ${changed} HTML files.`);
