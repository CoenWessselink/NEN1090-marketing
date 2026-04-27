# API AUTH release checklist

## API AUTH evidence
- [ ] Alembic migration `0019_auth_hardening_persistence.py` toegepast
- [ ] `password_reset_tokens` tabel aanwezig
- [ ] `auth_rate_limit_events` tabel aanwezig
- [ ] `refresh_tokens` bevat revocation velden en wordt actief gebruikt
- [ ] login success en failure worden geaudit
- [ ] refresh denial wordt geaudit
- [ ] logout wordt geaudit
- [ ] password reset request wordt geaudit
- [ ] password reset confirm wordt geaudit
- [ ] change password wordt geaudit
- [ ] `.env` staat niet in de repo-copy

## Negatieve security checks
- [ ] oude refresh token na rotatie geeft 401
- [ ] refresh token na logout geeft 401
- [ ] refresh token na change password geeft 401
- [ ] gebruikte reset link geeft 400
- [ ] verlopen reset link geeft 400
- [ ] tenant mismatch geeft 401/403 volgens endpoint-contract
