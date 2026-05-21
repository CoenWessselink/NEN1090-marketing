# Full Analytics + CI Fix Build

Plaats deze map over `C:\NEN1090\NEN1090-marketing`.

Voer daarna het PowerShell-commando uit dat in de chat staat.

Wat dit doet:
- injecteert Google Analytics `G-76WG0RRTNN` in alle HTML-bestanden;
- voegt de verplichte interne NL-links toe aan alle bestanden onder `/nl/`;
- genereert `sitemap.xml` opnieuw op basis van alle bestaande HTML-bestanden;
- genereert `sitemap-nl.xml`;
- voert een self-check uit op analytics, interne links en sitemap-kern-URL's.

Dit script overschrijft geen bestaande pagina-inhoud, maar voegt alleen ontbrekende blokken toe.
