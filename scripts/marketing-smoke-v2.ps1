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

$results = @()

foreach ($path in $paths) {
  $uri = $BaseUrl.TrimEnd("/") + $path
  try {
    $response = Invoke-WebRequest -Uri $uri -Method GET -TimeoutSec 30
    $results += [PSCustomObject]@{
      path = $path
      status = "PASS"
      code = [int]$response.StatusCode
    }
  }
  catch {
    $results += [PSCustomObject]@{
      path = $path
      status = "FAIL"
      code = -1
      error = $_.Exception.Message
    }
    throw
  }
}

$results | ConvertTo-Json -Depth 5
