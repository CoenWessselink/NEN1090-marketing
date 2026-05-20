# Fase 6.4 — Marketing CSP hardening

Status: afgerond voor testmoment
Datum: 2026-05-20
Repo: CoenWessselink/NEN1090-marketing

## Scope

Deze fase versterkt alleen de Content Security Policy van de marketing site. Geen visuele marketing-herbouw, geen formulierlogica-refactor en geen analytics-herbouw.

## Bevinding

De Cloudflare Pages headers staan in root `_headers`.

Voorheen bevatte de globale CSP:

```txt
script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com
```

Dat stond alle inline scripts toe. De marketing HTML bevat een vaste inline Google Analytics bootstrap naast de externe `gtag.js` loader.

## Wijziging

`script-src 'unsafe-inline'` is verwijderd en vervangen door een exacte SHA-256 hash van de bestaande inline Google Analytics bootstrap:

```txt
'sha256-zZWxRMs5taVUYDE28c5FoBuFq5cxWAp7sh+7SsYVvjs='
```

Daarnaast zijn aanvullende Google Analytics connect endpoints toegestaan:

- `https://analytics.google.com`
- `https://region1.google-analytics.com`

`style-src 'unsafe-inline'` is bewust behouden omdat meerdere pagina's inline `<style>` blokken gebruiken. Het verwijderen daarvan is een aparte CSS-extractie/refactor en valt buiten deze kleine hardeningfase.

## Live test checklist

Na deploy controleren:

1. Homepage laadt zonder CSP console errors.
2. `/trial.html` laadt zonder CSP console errors.
3. Trialformulier kan verzenden naar `/api/v1/onboarding/trial-signup`.
4. `/demo.html` laadt zonder CSP console errors.
5. Mobiel menu werkt.
6. Google Analytics/gtag wordt niet door CSP geblokkeerd.
7. Geen `Refused to execute inline script` voor de GA bootstrap.
8. Geen `Refused to connect` voor analytics endpoints of `/api/v1/...`.

## Niet gewijzigd

- Geen HTML scripts verplaatst.
- Geen CSS inline styles verwijderd.
- Geen forms herschreven.
- Geen Cloudflare proxy logic aangepast.
