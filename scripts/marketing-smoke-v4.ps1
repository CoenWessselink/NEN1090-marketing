param(
  [string]$BaseUrl = "https://nen1090-marketing-new.pages.dev"
)

$ErrorActionPreference = "Stop"

$paths = @(
  "/",
  "/app/login.html",
  "/app/forgot-password.html",
  "/app/reset-password.html",
  "/app/set-password.html",
  "/app/change-password.html",
  "/app/logout.html"
)

foreach ($path in $paths) {
  $uri = $BaseUrl.TrimEnd("/") + $path
  $response = Invoke-WebRequest -Uri $uri -Method GET -TimeoutSec 30
  if ([int]$response.StatusCode -lt 200 -or [int]$response.StatusCode -ge 400) {
    throw "Niet-OK status voor $path : $($response.StatusCode)"
  }
}
Write-Host "Marketing smoke PASS"
