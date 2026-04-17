param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,
  [string]$RequireSchema = 'v1',
  [switch]$UseShareUrl
)

. (Join-Path $PSScriptRoot '_common.ps1')

$effectiveUrl = $BaseUrl.Trim()
$routes = @('/', '/practice', '/exam', '/admin', '/api/health')

if ($UseShareUrl) {
  $effectiveUrl = & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'vercel-preview-share.ps1') -Url $BaseUrl
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo generar la share URL para '$BaseUrl'."
  }

  $effectiveUrl = $effectiveUrl.Trim()
}

$baseUri = [Uri]$effectiveUrl
$requestBase = "$($baseUri.Scheme)://$($baseUri.Authority)"
$failures = New-Object System.Collections.Generic.List[string]
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

if ($UseShareUrl) {
  try {
    Invoke-WebRequest -Uri $effectiveUrl -WebSession $session -MaximumRedirection 5 | Out-Null
  } catch {
    throw "No se pudo inicializar la sesión protegida para '$effectiveUrl': $($_.Exception.Message)"
  }
}

foreach ($route in $routes) {
  $routeUri = [Uri]::new([Uri]$requestBase, $route)

  try {
    $response = Invoke-WebRequest -Uri $routeUri -WebSession $session -MaximumRedirection 5 -Headers @{ 'Cache-Control' = 'no-cache' }
  } catch {
    $statusCode = $null
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    if ($statusCode) {
      $failures.Add("${route}: HTTP $statusCode")
    } else {
      $failures.Add("${route}: $($_.Exception.Message)")
    }
    continue
  }

  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
    $failures.Add("${route}: HTTP $($response.StatusCode)")
    continue
  }

  if ($route -eq '/api/health') {
    $payload = $response.Content | ConvertFrom-Json

    if (-not $payload.ok -or -not $payload.databaseReachable) {
      $detail = if ($payload.error) { $payload.error } else { 'sin detalle' }
      $failures.Add("${route}: health check inválido ($detail)")
      continue
    }

    if ($RequireSchema.Trim() -and $payload.schema -ne $RequireSchema.Trim()) {
      $failures.Add("${route}: schema esperado $($RequireSchema.Trim()) y recibido $($payload.schema)")
    }
  }
}

if ($failures.Count -gt 0) {
  $failures | ForEach-Object { Write-Error $_ }
  throw "Smoke check falló para '$requestBase'."
}

Write-Output "Smoke check protegido pasó para $requestBase"
