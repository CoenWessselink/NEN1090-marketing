# API auth alignment completed

Afgerond in deze build:
- login response bevat nu ook `user` metadata
- refresh response bevat nu ook `user` metadata
- logout werkt nu met bearer session en optioneel refresh token
- reset-password request endpoint toegevoegd
- reset-password confirm endpoint toegevoegd
- change-password endpoint toegevoegd
- eenvoudige rate limiting op reset request toegevoegd
- password policy validatie toegevoegd
- refresh tokens worden ingetrokken bij reset/change password

Belangrijke bestanden:
- `app/api/v1/auth.py`
- `app/schemas/auth.py`
- `app/core/security.py`
- `app/core/config.py`
- `requirements.txt`
