from pathlib import Path
import re, json
root = Path('.').resolve()
html_files = sorted([p for p in root.rglob('*.html') if 'dist' not in p.parts and 'node_modules' not in p.parts])
asset_pattern = re.compile(r'''(?:src|href)=['"](/[^'"#?]+)''')
issues=[]
checked=[]
for html in html_files:
    text = html.read_text(encoding='utf-8', errors='ignore')
    refs=[]
    for ref in asset_pattern.findall(text):
        if ref.startswith('http') or ref.startswith('//'): continue
        refs.append(ref)
        target = root / ref.lstrip('/')
        if not target.exists():
            issues.append({'file': str(html.relative_to(root)), 'missing': ref})
    checked.append({'file': str(html.relative_to(root)), 'refs': refs})
required = [
    'pricing.html','checkout.html','success.html','cancel.html',
    'app/login.html','app/forgot-password.html','app/reset-password.html',
    'app/set-password.html','app/change-password.html','app/logout.html','app/subscription.html',
    'assets/js/billing.js','assets/js/auth_api.js','assets/css/billing.css','assets/css/auth.css',
    'functions/api/checkout/create-session.js','functions/api/checkout/status.js',
    'functions/api/billing/subscription.js','functions/api/billing/update-subscription.js','functions/api/billing/cancel-subscription.js'
]
missing_required=[p for p in required if not (root/p).exists()]
report = {
    'html_files_checked': len(html_files),
    'missing_asset_refs': issues,
    'missing_required_files': missing_required,
}
Path('BUILD_BLOCK3_AUDIT.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
md = []
md.append('# BUILD BLOCK 3 AUDIT')
md.append('')
md.append(f'- Gecontroleerde HTML-bestanden: **{len(html_files)}**')
md.append(f'- Ontbrekende lokale asset-verwijzingen: **{len(issues)}**')
md.append(f'- Ontbrekende vereiste bestanden: **{len(missing_required)}**')
md.append('')
if issues:
    md.append('## Ontbrekende asset-verwijzingen')
    for item in issues[:50]:
        md.append(f"- `{item['file']}` mist `{item['missing']}`")
    md.append('')
if missing_required:
    md.append('## Ontbrekende vereiste bestanden')
    for item in missing_required:
        md.append(f'- `{item}`')
    md.append('')
if not issues and not missing_required:
    md.append('Geen ontbrekende lokale asset-verwijzingen of verplichte bestanden gevonden in deze statische audit.')
Path('BUILD_BLOCK3_AUDIT.md').write_text('\n'.join(md), encoding='utf-8')
print('\n'.join(md))
