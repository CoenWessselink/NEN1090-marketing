
from pathlib import Path
import sys

required = [
    'main.py',
    'alembic.ini',
    'requirements.txt',
    'app/main.py',
    'app/api/v1/router.py',
    'app/api/v1/ops.py',
    'app/middleware/rate_limit.py',
    'app/middleware/security_headers.py',
]

missing = [p for p in required if not Path(p).exists()]
if missing:
    print('Missing required production files:')
    for item in missing:
        print('-', item)
    sys.exit(1)
print('Preflight OK')
