import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const routes = [
  ['platform.html', 'platform/index.html'],
  ['inspections.html', 'inspections/index.html'],
  ['reports.html', 'reports/index.html'],
  ['pricing.html', 'pricing/index.html'],
  ['checkout.html', 'checkout/index.html'],
  ['demo.html', 'demo/index.html'],
  ['security.html', 'security/index.html'],
  ['standards.html', 'standards/index.html'],
  ['resources.html', 'resources/index.html'],
  ['contact.html', 'contact/index.html'],
  ['trial.html', 'trial/index.html'],
  ['use-cases.html', 'use-cases/index.html'],
  ['case-studies.html', 'case-studies/index.html'],
  ['privacy.html', 'privacy/index.html'],
  ['terms.html', 'terms/index.html'],
  ['legal.html', 'legal/index.html'],
  ['dpa.html', 'dpa/index.html'],
  ['en-1090.html', 'en-1090/index.html'],
  ['iso-3834.html', 'iso-3834/index.html'],
  ['iso-5817.html', 'iso-5817/index.html'],
  ['iso-15609.html', 'iso-15609/index.html'],
  ['iso-9606-1.html', 'iso-9606-1/index.html'],
  ['en-10204.html', 'en-10204/index.html'],
  ['nl/lasinspectie-software.html', 'nl/lasinspectie-software/index.html'],
  ['nl/en-1090-software.html', 'nl/en-1090-software/index.html'],
  ['nl/ce-dossier-software.html', 'nl/ce-dossier-software/index.html'],
  ['nl/prijzen.html', 'nl/prijzen/index.html'],
  ['nl/checkout.html', 'nl/checkout/index.html'],
  ['nl/demo.html', 'nl/demo/index.html'],
  ['nl/contact.html', 'nl/contact/index.html'],
  ['nl/trial.html', 'nl/trial/index.html'],
];

for (const [source, target] of routes) {
  if (!existsSync(source)) {
    throw new Error(`Missing source page for clean route: ${source}`);
  }
  mkdirSync(dirname(join(process.cwd(), target)), { recursive: true });
  copyFileSync(source, target);
}

console.log(`Synced ${routes.length} clean-route index files.`);
