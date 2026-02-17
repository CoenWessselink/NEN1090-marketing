# Cloudflare Live Ruleset – Aanbevolen (NEN1090)

## 1) DNS & SSL
- SSL/TLS: **Full (strict)**
- Always Use HTTPS: **ON**
- HSTS: **ON** (na validatie), includeSubDomains + preload indien gewenst

## 2) Caching
- Cache Everything: **NIET** voor `/api/*`
- Statische assets (`*.css, *.js, *.png, *.webp`): Cache TTL 7–30 dagen
- HTML: Cache TTL laag (0–1 uur) tenzij je versie-based busting gebruikt

## 3) Security headers (Pages `_headers`)
- CSP: strict (alleen allow-list voor Mollie + Turnstile)
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()

## 4) WAF
- Managed Rules: **ON**
- OWASP Core Rules: **ON**
- Sensitivity: medium (later tunen)
- Zet exceptions alleen per route als echt nodig

## 5) Bot & Abuse bescherming
- Bot Fight Mode: **ON**
- Rate Limiting:
  - `/api/auth/login`: 10/min per IP
  - `/api/demo/start`: 10/min per IP
  - `/api/checkout/*`: 10/min per IP
  - `/api/mollie/webhook`: allow only Mollie IP ranges (of via secret token)
- Turnstile: verplicht voor login/checkout/demo (in deze build al afgedwongen)

## 6) Analytics
- Web Analytics: ON (optioneel)
- Zet alerts op 4xx/5xx spikes

## 7) Deploy discipline
- Staging branch + production branch
- Staging domain (bijv. `staging.nen1090...`) voor pre-flight tests
