param(
    [string]$RepoRoot = "C:\NEN1090\NEN1090-marketing"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $RepoRoot)) {
    throw "RepoRoot niet gevonden: $RepoRoot"
}

Write-Host "Marketing Vite repair gestart in $RepoRoot" -ForegroundColor Cyan

$htmlFiles = Get-ChildItem -Path $RepoRoot -Recurse -Filter *.html -File
$updated = @()

foreach ($file in $htmlFiles) {
    $raw = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $new = $raw

    # Voeg type="module" toe aan lokale JS scripts die nu zonder module worden geladen
    $new = [regex]::Replace(
        $new,
        '<script(?![^>]*\btype=)([^>]*\bsrc="(?:/assets/js/|assets/js/)[^"]+\.js"[^>]*)></script>',
        '<script type="module"$1></script>',
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )

    # Fix voor Vite build op features/index.html: directory-URL niet als build-asset laten interpreteren
    if ($file.FullName -replace '/', '\' -like '*\features\index.html') {
        $new = $new -replace 'href="/features/"\s+rel="canonical"', 'href="https://nen1090-marketing-new.pages.dev/features/" rel="canonical"'
    }

    if ($new -ne $raw) {
        Set-Content -Path $file.FullName -Value $new -Encoding UTF8
        $updated += $file.FullName
    }
}

# Zorg dat package.json build via lokale vite-bin loopt
$packageJson = Join-Path $RepoRoot 'package.json'
if (Test-Path $packageJson) {
    $pkgRaw = Get-Content -Path $packageJson -Raw -Encoding UTF8
    $pkgNew = $pkgRaw `
        -replace '"dev"\s*:\s*"vite --host 127\.0\.0\.1 --port 5173"', '"dev": "node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173"' `
        -replace '"build"\s*:\s*"vite build"', '"build": "node ./node_modules/vite/bin/vite.js build"' `
        -replace '"preview"\s*:\s*"vite preview --host 127\.0\.0\.1 --port 4173"', '"preview": "node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173"'
    if ($pkgNew -ne $pkgRaw) {
        Set-Content -Path $packageJson -Value $pkgNew -Encoding UTF8
        $updated += $packageJson
    }
}

$logPath = Join-Path $RepoRoot 'VITE_REPAIR_LOG.txt'
@(
    "Vite repair uitgevoerd: $(Get-Date -Format s)"
    "Aangepaste bestanden:"
    ($updated | ForEach-Object { "- $_" })
) | Set-Content -Path $logPath -Encoding UTF8

Write-Host ""
Write-Host "Klaar. Aangepast:" -ForegroundColor Green
$updated | ForEach-Object { Write-Host $_ }
Write-Host ""
Write-Host "Logbestand: $logPath" -ForegroundColor Yellow
