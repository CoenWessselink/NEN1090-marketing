import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const root = process.cwd();
const required = ['index.html','platform.html','inspections.html','reports.html','standards.html','pricing.html','resources.html','trial.html','demo.html','assets/css/site.css','assets/js/site.js','functions/api/[[path]].js','_headers','_redirects'];
const missing = required.filter((file) => !existsSync(join(root, file)));
if (missing.length) { console.error(`Missing required files:\n${missing.join('\n')}`); process.exit(1); }
const htmlFiles = readdirSync(root).filter((file) => file.endsWith('.html'));
const forbidden = ['Connect this form to the production API endpoint','placeholder','Placeholder'];
const violations = [];
for (const file of htmlFiles) {
  const text = readFileSync(join(root, file), 'utf8');
  for (const needle of forbidden) if (text.includes(needle)) violations.push(`${file}: contains "${needle}"`);
  if (!text.includes('assets/css/site.css')) violations.push(`${file}: missing stylesheet`);
  if (!text.includes('assets/js/site.js')) violations.push(`${file}: missing script`);
}
if (violations.length) { console.error(`Validation failed:\n${violations.join('\n')}`); process.exit(1); }
console.log(`Validated ${htmlFiles.length} HTML pages and required production files.`);
