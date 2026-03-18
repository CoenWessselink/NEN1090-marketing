#!/usr/bin/env python3
import os, sys, requests
base = os.getenv('API_BASE_URL', '').rstrip('/')
if not base:
    print('API_BASE_URL is verplicht', file=sys.stderr)
    sys.exit(1)
paths = ['/health', '/api/v1/health', '/api/v1/public/config']
failed = False
for path in paths:
    url = base + path
    try:
        r = requests.get(url, timeout=20)
        print(('OK  ' if r.ok else 'WARN'), r.status_code, url)
        if not r.ok:
            failed = True
    except Exception as exc:
        print('FAIL', url, str(exc), file=sys.stderr)
        failed = True
print('READY' if not failed else 'CHECK_FAILED')
sys.exit(1 if failed else 0)
