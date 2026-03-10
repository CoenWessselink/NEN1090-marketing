# NEN1090 Marketing (FULL) + Klantbeheer-proxy (Vite + Cloudflare Pages)

Deze repo is gebaseerd op **Website_juiste_instellngen.zip** (complete marketing site).
Extra toegevoegd:
- Universele Cloudflare Pages Function proxy: `functions/api/[[path]].js`
  - Frontend gebruikt dezelfde origin en roept ALLEEN `/api/v1/...` aan
  - Proxy forward 1:1 naar Azure backend
  - HttpOnly cookies: `nen1090_access` + `nen1090_refresh`
- Vite multi-page build (alle HTML pagina's worden meegenomen)

## Lokaal testen (Windows)
Dubbelklik: `START_LOCAL_WRANGLER.bat`
- Installeert deps, buildt `dist/`, start `wrangler pages dev dist` op poort 8788.

## Deploy (Cloudflare Pages)
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable (optioneel): `AZURE_API_ORIGIN` (Azure origin, default staat al in de proxy)
