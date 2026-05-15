# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a **static marketing website** (HTML/CSS/JS, no framework) for WeldInspect Pro, hosted on Cloudflare Pages. There are no build steps or compilation — `npm run build` / `npm run validate` runs a validation script only.

### Services

| Service | Command | Notes |
|---------|---------|-------|
| Dev server | `wrangler pages dev . --port 8788` | Serves static files + Cloudflare Pages Functions (API proxy). Requires `wrangler` installed globally (`npm install -g wrangler`). |

### Key commands

- **Validate**: `npm run validate` — checks required files exist, validates meta tags, forbidden strings, legal links, and sitemaps (135 HTML pages).
- **Dev server**: `wrangler pages dev . --port 8788` — local dev server with API proxy support.
- **No lint/test framework** is configured; CI (`.github/workflows/ci.yml`) uses shell-based file-existence and grep checks.

### Gotchas

- Pages like `/pricing.html` return **308** redirects (Cloudflare Pages convention for `.html` extension rewriting). Use `curl -L` when testing.
- The `/pricing` path redirects to `/nl/prijzen` via `_redirects` — this is intentional (Dutch locale default).
- The API proxy at `functions/api/[[path]].js` forwards to an external Azure-hosted backend. The proxy works locally but the upstream API may not have all endpoints.
- No `package-lock.json` or dependencies exist; `npm install` is a no-op but harmless.
