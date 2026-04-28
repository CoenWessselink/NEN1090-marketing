param(
  [string]$Root = ".",
  [string]$MeasurementId = "G-76WG0RRTNN"
)

$ErrorActionPreference = "Stop"

$analyticsTag = @"
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=$MeasurementId"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '$MeasurementId');
</script>
"@

$requiredLinks = @"
<section class="required-links analytics-ci-required-links" aria-label="Belangrijke Nederlandse SEO links">
  <a href="/nl/lasinspectie-software.html">lasinspectie software</a>
  <a href="/nl/en-1090-software.html">EN 1090 software</a>
  <a href="/nl/ce-dossier-software.html">CE dossier software</a>
</section>
"@

function Read-Utf8File([string]$Path) {
  return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8File([string]$Path, [string]$Content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

function Ensure-GoogleAnalytics([string]$Content) {
  if ($Content -match [regex]::Escape($MeasurementId) -or $Content -match "googletagmanager\.com/gtag/js") {
    return $Content
  }

  if ($Content -match "(?i)<head[^>]*>") {
    return [regex]::Replace($Content, "(?i)(<head[^>]*>)", "`$1`n$analyticsTag`n", 1)
  }

  return $Content
}

function Ensure-NlRequiredLinks([string]$Content) {
  $hasLasinspectie = $Content -match [regex]::Escape('/nl/lasinspectie-software.html')
  $hasEn1090 = $Content -match [regex]::Escape('/nl/en-1090-software.html')
  $hasCe = $Content -match [regex]::Escape('/nl/ce-dossier-software.html')

  if ($hasLasinspectie -and $hasEn1090 -and $hasCe) {
    return $Content
  }

  if ($Content -match "(?i)</body>") {
    return [regex]::Replace($Content, "(?i)</body>", "$requiredLinks`n</body>", 1)
  }

  return "$Content`n$requiredLinks`n"
}

$repoRoot = Resolve-Path $Root
$htmlFiles = Get-ChildItem -Path $repoRoot -Recurse -File -Filter "*.html" |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\dist\\" -and
    $_.FullName -notmatch "\\build\\"
  }

foreach ($file in $htmlFiles) {
  $content = Read-Utf8File $file.FullName
  $updated = Ensure-GoogleAnalytics $content

  $relative = [System.IO.Path]::GetRelativePath($repoRoot, $file.FullName).Replace("\", "/")
  if ($relative -like "nl/*") {
    $updated = Ensure-NlRequiredLinks $updated
  }

  if ($updated -ne $content) {
    Write-Utf8File $file.FullName $updated
    Write-Host "Updated $relative"
  }
}

# Rebuild sitemap.xml from actual HTML files. Excludes non-public generated build folders.
$baseUrl = "https://weldinspectpro.com"
$today = (Get-Date).ToString("yyyy-MM-dd")

$urlEntries = New-Object System.Collections.Generic.List[string]

foreach ($file in ($htmlFiles | Sort-Object FullName)) {
  $relative = [System.IO.Path]::GetRelativePath($repoRoot, $file.FullName).Replace("\", "/")

  if ($relative -match "^(node_modules|dist|build)/") { continue }

  $urlPath = $relative
  if ($urlPath -eq "index.html") {
    $urlPath = ""
  } elseif ($urlPath.EndsWith("/index.html")) {
    $urlPath = $urlPath.Substring(0, $urlPath.Length - "index.html".Length)
  }

  $loc = "$baseUrl/$urlPath"
  $loc = $loc -replace "(?<!:)//+", "/"
  $loc = $loc -replace "^https:/", "https://"

  $priority = "0.7"
  if ($loc -eq "$baseUrl/") { $priority = "1.0" }
  elseif ($loc -eq "$baseUrl/nl/") { $priority = "1.0" }
  elseif ($loc -match "/nl/(lasinspectie-software|en-1090-software|ce-dossier-software|iso-3834-software|wps-wpq-beheer|lascontrole-software|lasinspectie-software-nederland)\.html$") { $priority = "0.9" }
  elseif ($loc -match "/(trial|demo|pricing|prijzen)\.html$") { $priority = "0.8" }

  $urlEntries.Add("<url><loc>$loc</loc><lastmod>$today</lastmod><changefreq>weekly</changefreq><priority>$priority</priority></url>")
}

$sitemap = "<?xml version=""1.0"" encoding=""UTF-8""?>`n<urlset xmlns=""http://www.sitemaps.org/schemas/sitemap/0.9"">`n" + ($urlEntries -join "`n") + "`n</urlset>`n"
Write-Utf8File (Join-Path $repoRoot "sitemap.xml") $sitemap

# Optional NL-only sitemap for future submission if desired.
$nlEntries = $urlEntries | Where-Object { $_ -match "https://weldinspectpro\.com/nl/" }
$sitemapNl = "<?xml version=""1.0"" encoding=""UTF-8""?>`n<urlset xmlns=""http://www.sitemaps.org/schemas/sitemap/0.9"">`n" + ($nlEntries -join "`n") + "`n</urlset>`n"
Write-Utf8File (Join-Path $repoRoot "sitemap-nl.xml") $sitemapNl

# Self-checks matching CI intent.
$failed = $false
foreach ($file in $htmlFiles) {
  $relative = [System.IO.Path]::GetRelativePath($repoRoot, $file.FullName).Replace("\", "/")
  $content = Read-Utf8File $file.FullName

  if ($content -notmatch [regex]::Escape($MeasurementId)) {
    Write-Error "Missing Google Analytics tag in $relative"
    $failed = $true
  }

  if ($relative -like "nl/*") {
    foreach ($required in @("/nl/lasinspectie-software.html", "/nl/en-1090-software.html", "/nl/ce-dossier-software.html")) {
      if ($content -notmatch [regex]::Escape($required)) {
        Write-Error "Missing required internal link $required in $relative"
        $failed = $true
      }
    }
  }
}

$sitemapContent = Read-Utf8File (Join-Path $repoRoot "sitemap.xml")
foreach ($requiredUrl in @(
  "https://weldinspectpro.com/",
  "https://weldinspectpro.com/nl/",
  "https://weldinspectpro.com/nl/lasinspectie-software.html",
  "https://weldinspectpro.com/nl/en-1090-software.html",
  "https://weldinspectpro.com/nl/ce-dossier-software.html"
)) {
  if ($sitemapContent -notmatch [regex]::Escape($requiredUrl)) {
    Write-Error "Missing sitemap URL $requiredUrl"
    $failed = $true
  }
}

if ($failed) {
  throw "Full analytics/CI fix self-check failed."
}

Write-Host "Full analytics/CI fix completed successfully."
