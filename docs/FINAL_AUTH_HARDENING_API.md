# Final auth hardening – api

Afgerond in deze wave:
- reset-tokens bevatten nu een `jti` claim
- gebruikte resetlinks worden eenmalig gemaakt via server-side replay-protectie
- refresh-tokens en sessies worden centraal ingetrokken via helperfunctie
- bearer-claims controleren nu ook expliciet op ongeldige tenant headers
