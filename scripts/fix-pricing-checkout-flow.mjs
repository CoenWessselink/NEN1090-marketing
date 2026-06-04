import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';

const EN_PRICING = ['pricing.html', 'pricing/index.html'];
const NL_PRICING = ['nl/prijzen.html', 'nl/prijzen/index.html'];

const enPricingSection = `<section class="section"><div class="container"><div class="section-head"><span class="kicker">Plans</span><h2>Choose a plan and continue directly to secure Mollie checkout</h2><p>Published prices are shown including VAT. Select monthly or yearly billing and continue to the checkout page, where the amount, VAT and number of users are calculated again before the Mollie payment is created.</p></div><div class="pricing-cards"><article class="pricing-card"><span>Monthly</span><h3>Professional monthly</h3><p>For teams that want to start immediately and keep the subscription flexible.</p><div class="price-display"><strong>&euro;59</strong><small>incl. VAT / user / month</small></div><ul class="check-list"><li>Projects, welds and inspections</li><li>WPS/WPQ and document context</li><li>Monthly cancellable billing</li></ul><a class="btn btn-primary" href="/nl/checkout?cycle=monthly&amp;seats=1">Pay monthly via Mollie</a></article><article class="pricing-card featured"><span>Yearly</span><h3>Professional yearly</h3><p>For QA/QC teams that want the best yearly price for the same full workflow.</p><div class="price-display"><strong>&euro;592.90</strong><small>incl. VAT / user / year</small></div><ul class="check-list"><li>Full weld inspection workflow</li><li>Evidence, traceability and reporting</li><li>Lower yearly total than monthly billing</li></ul><a class="btn btn-primary" href="/nl/checkout?cycle=yearly&amp;seats=1">Pay yearly via Mollie</a></article><article class="pricing-card"><span>Enterprise</span><h3>Custom organisation plan</h3><p>For larger organisations with multiple teams, security requirements or broader implementation needs.</p><div class="price-display"><strong>Custom</strong><small>scope-based pricing</small></div><ul class="check-list"><li>Multi-team workflow review</li><li>Security and access discussion</li><li>Implementation scope alignment</li></ul><a class="btn btn-outline" href="/contact">Contact sales</a></article></div></div></section>`;

const nlPricingSection = `<section class="section"><div class="container"><div class="section-head"><span class="kicker">Abonnementen</span><h2>Kies een abonnement en ga direct door naar veilig betalen via Mollie</h2><p>De gepubliceerde prijzen zijn inclusief btw. Kies maandelijks of jaarlijks afrekenen en ga door naar de checkoutpagina, waar bedrag, btw en aantal gebruikers opnieuw worden berekend voordat de Mollie-betaling wordt aangemaakt.</p></div><div class="pricing-cards"><article class="pricing-card"><span>Maandelijks</span><h3>Professional maandelijks</h3><p>Voor teams die direct willen starten en het abonnement flexibel willen houden.</p><div class="price-display"><strong>&euro;59</strong><small>incl. btw / gebruiker / maand</small></div><ul class="check-list"><li>Projecten, lassen en inspecties</li><li>WPS/WPQ en documentcontext</li><li>Maandelijks opzegbare betaling</li></ul><a class="btn btn-primary" href="/nl/checkout?cycle=monthly&amp;seats=1">Betaal maandelijks via Mollie</a></article><article class="pricing-card featured"><span>Jaarlijks</span><h3>Professional jaarlijks</h3><p>Voor QA/QC-teams die de voordeligste jaarprijs willen voor dezelfde volledige workflow.</p><div class="price-display"><strong>&euro;592,90</strong><small>incl. btw / gebruiker / jaar</small></div><ul class="check-list"><li>Volledige lasinspectie-workflow</li><li>Bewijs, traceerbaarheid en rapportage</li><li>Voordeliger totaal dan maandelijks</li></ul><a class="btn btn-primary" href="/nl/checkout?cycle=yearly&amp;seats=1">Betaal jaarlijks via Mollie</a></article><article class="pricing-card"><span>Enterprise</span><h3>Organisatieplan op maat</h3><p>Voor grotere organisaties met meerdere teams, security-eisen of bredere implementatiebehoeften.</p><div class="price-display"><strong>Op maat</strong><small>prijs op basis van scope</small></div><ul class="check-list"><li>Multi-team workflow review</li><li>Security en toegangsbeheer bespreken</li><li>Implementatiescope afstemmen</li></ul><a class="btn btn-outline" href="/nl/contact">Neem contact op</a></article></div></div></section>`;

const enHeroActions = `<div class="hero-actions"><a class="btn btn-primary btn-large" href="/nl/checkout?cycle=yearly&amp;seats=1">Pay yearly via Mollie</a><a class="btn btn-outline btn-large" href="/nl/checkout?cycle=monthly&amp;seats=1">Pay monthly</a></div>`;
const nlHeroActions = `<div class="hero-actions"><a class="btn btn-primary btn-large" href="/nl/checkout?cycle=yearly&amp;seats=1">Betaal jaarlijks via Mollie</a><a class="btn btn-outline btn-large" href="/nl/checkout?cycle=monthly&amp;seats=1">Betaal maandelijks</a></div>`;

function replaceBetween(html, start, end, replacement) {
  const a = html.indexOf(start);
  if (a === -1) throw new Error(`Missing start marker: ${start}`);
  const b = html.indexOf(end, a);
  if (b === -1) throw new Error(`Missing end marker: ${end}`);
  return html.slice(0, a) + replacement + html.slice(b);
}

function updatePricing(file, section, heroActions, english) {
  let html = readFileSync(file, 'utf8');
  html = html.replace(
    /<div class="hero-actions"><a class="btn btn-primary btn-large" href="[^"]+">[^<]+<\/a><a class="btn btn-outline btn-large" href="[^"]+">[^<]+<\/a><\/div>/,
    heroActions,
  );
  html = replaceBetween(
    html,
    '<section class="section"><div class="container"><div class="section-head"><span class="kicker">',
    '<section class="section section-alt">',
    section,
  );
  if (english) {
    html = html.replace(
      'Choose the evaluation route that fits your team: trial access for hands-on review, a product demo for workflow mapping, or a sales conversation for multi-team documentation needs.',
      'Choose monthly or yearly billing and continue to a secure Mollie checkout. The checkout calculates the selected billing cycle, number of users, VAT and final amount before payment.',
    );
    html = html.replaceAll('<a class="btn btn-primary btn-large" href="/trial">Start Free Trial</a><a class="btn btn-outline btn-large" href="/demo">Book a Demo</a>', '<a class="btn btn-primary btn-large" href="/nl/checkout?cycle=yearly&amp;seats=1">Pay yearly via Mollie</a><a class="btn btn-outline btn-large" href="/nl/checkout?cycle=monthly&amp;seats=1">Pay monthly</a>');
    html = html.replaceAll('<a class="btn btn-primary btn-large" href="/trial">Pay yearly via Mollie</a>', '<a class="btn btn-primary btn-large" href="/nl/checkout?cycle=yearly&amp;seats=1">Pay yearly via Mollie</a>');
  } else {
    html = html.replace(
      'Bekijk pakketten, start een proefperiode of plan een demo voor uw lasinspectie- en documentatiewerkproces.',
      'Kies maandelijks of jaarlijks afrekenen en ga door naar de beveiligde Mollie checkout. De checkout berekent het gekozen abonnement, aantal gebruikers, btw en eindbedrag voordat u betaalt.',
    );
    html = html.replace(/<!-- pricing-cycle-ctas -->[\s\S]*?<section class="final-cta visual-cta">/, '<section class="final-cta visual-cta">');
    html = html.replaceAll('<a class="btn btn-primary btn-large" href="/nl/trial">Start proefperiode</a><a class="btn btn-outline btn-large" href="/nl/demo">Plan demo</a>', '<a class="btn btn-primary btn-large" href="/nl/checkout?cycle=yearly&amp;seats=1">Betaal jaarlijks via Mollie</a><a class="btn btn-outline btn-large" href="/nl/checkout?cycle=monthly&amp;seats=1">Betaal maandelijks</a>');
    html = html.replaceAll('<a class="btn btn-primary btn-large" href="/nl/trial">Betaal jaarlijks via Mollie</a>', '<a class="btn btn-primary btn-large" href="/nl/checkout?cycle=yearly&amp;seats=1">Betaal jaarlijks via Mollie</a>');
  }
  writeFileSync(file, html);
}

for (const file of EN_PRICING) updatePricing(file, enPricingSection, enHeroActions, true);
for (const file of NL_PRICING) updatePricing(file, nlPricingSection, nlHeroActions, false);

let checkout = readFileSync('checkout.html', 'utf8');
checkout = checkout.replace(
  '<meta http-equiv="refresh" content="0; url=/nl/checkout.html?cycle=yearly">',
  `<script>
    const target = new URL('/nl/checkout', location.origin);
    target.search = location.search;
    location.replace(target.pathname + target.search);
  </script>
  <meta http-equiv="refresh" content="0; url=/nl/checkout?cycle=yearly&amp;seats=1">`,
);
checkout = checkout.replaceAll('/nl/checkout.html?cycle=yearly', '/nl/checkout?cycle=yearly&amp;seats=1');
writeFileSync('checkout.html', checkout);

for (const dir of ['checkout']) {
  if (!existsSync(dir)) mkdirSync(dir);
  copyFileSync('checkout.html', `${dir}/index.html`);
}
if (!existsSync('nl/checkout')) mkdirSync('nl/checkout', { recursive: true });
copyFileSync('nl/checkout.html', 'nl/checkout/index.html');

console.log('Pricing pages now link fixed monthly/yearly amounts to Mollie checkout routes.');
