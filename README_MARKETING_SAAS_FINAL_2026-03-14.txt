NEN1090 MARKETING SAAS FINAL BUILD – 2026-03-14

Deze build voert de gevraagde marketing-aanpassingen in één pakket door:
- hele marketingsite strakker en consistenter in enterprise SaaS-stijl
- echte app screenshots geïntegreerd in hero, screenshots en landingspagina’s
- lasser / staalbouw fotografie verwerkt voor meer geloofwaardigheid en sfeer
- pricing + conversion UX verbeterd
- contact en demo gelijkgetrokken
- login, demo, checkout en app/API-routes logisch aangesloten

Belangrijk:
- login verwijst nu naar /app/login.html
- demo gebruikt /api/demo/start
- checkout gebruikt /api/checkout/create-session
- checkout function bug met requireTurnstile is gefixt

Lokaal starten:
1. Open terminal in de map NEN1090-marketing
2. Gebruik:
   npx http-server -p 8080
3. Open:
   http://localhost:8080/index.html

Github:
Ik heb in deze omgeving geen geauthenticeerde GitHub push-toegang. De build is wel klaar om direct te committen en te pushen.
Aanbevolen commando’s:
git add .
git commit -m "Marketing: SaaS pixel-perfect rebuild with screenshots, welding photography and pricing UX"
git push origin <branchnaam>
