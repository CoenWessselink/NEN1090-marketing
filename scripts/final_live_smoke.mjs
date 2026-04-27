#!/usr/bin/env node
const base = (process.env.MARKETING_BASE_URL || '').replace(/\/$/, '');
if (!base) {
  console.error('MARKETING_BASE_URL is verplicht');
  process.exit(1);
}
const targets = [
  '/api/public/config',
  '/app/login.html',
  '/app/set-password.html',
  '/api/onboarding/status',
  '/api/checkout/status?orderRef=phase4-smoke',
];
for (const path of targets) {
  const url = base + path;
  const res = await fetch(url, { redirect: 'manual', headers: { accept: 'application/json,text/html' } }).catch((error) => ({ ok: false, status: 0, error }));
  if (!res || res.status === 0) {
    console.error(`FAIL ${url}: ${res?.error?.message || 'request_failed'}`);
    process.exitCode = 1;
    continue;
  }
  console.log(`${res.ok ? 'OK  ' : 'WARN'} ${res.status} ${url}`);
}
