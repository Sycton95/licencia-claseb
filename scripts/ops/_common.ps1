Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-OpsRepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Get-OpsProjectMetadata {
  $repoRoot = Get-OpsRepoRoot
  $projectPath = Join-Path $repoRoot '.vercel\project.json'

  if (-not (Test-Path -LiteralPath $projectPath)) {
    throw "No se encontró .vercel/project.json. Vincula el proyecto con Vercel antes de usar estos scripts."
  }

  return Get-Content -LiteralPath $projectPath -Raw | ConvertFrom-Json
}

function Assert-CodexBranch {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Branch
  )

  $normalized = $Branch.Trim()

  if ([string]::IsNullOrWhiteSpace($normalized)) {
    throw 'La rama no puede estar vacía.'
  }

  if ($normalized -eq 'main' -or $normalized -eq 'production') {
    throw "La rama '$normalized' no está permitida para scripts de preview."
  }

  if ($normalized -notmatch '^codex\/') {
    throw "La rama '$normalized' no coincide con el patrón permitido codex/*."
  }

  return $normalized
}

function Get-AllowedPreviewEnvNames {
  return @(
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  )
}

function Normalize-EnvValue {
  param(
    [AllowNull()]
    [string]$Value
  )

  if ($null -eq $Value) {
    return $null
  }

  $normalized = $Value.Trim()

  if (
    $normalized.Length -ge 2 -and
    (
      ($normalized.StartsWith('"') -and $normalized.EndsWith('"')) -or
      ($normalized.StartsWith("'") -and $normalized.EndsWith("'"))
    )
  ) {
    $normalized = $normalized.Substring(1, $normalized.Length - 2).Trim()
  }

  return $normalized.Trim()
}

function Get-EnvFileValueMap {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $resolvedPath = Resolve-Path -LiteralPath $Path -ErrorAction Stop
  $values = @{}

  foreach ($line in Get-Content -LiteralPath $resolvedPath.Path) {
    if ($line -match '^\s*#' -or $line -match '^\s*$') {
      continue
    }

    $parts = $line -split '=', 2
    if ($parts.Length -ne 2) {
      continue
    }

    $key = $parts[0].Trim()
    if ([string]::IsNullOrWhiteSpace($key)) {
      continue
    }

    $values[$key] = Normalize-EnvValue $parts[1]
  }

  return $values
}

function Get-RequiredEnvValue {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Values,
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$FileLabel
  )

  if (-not $Values.ContainsKey($Name)) {
    throw "Falta '$Name' en $FileLabel."
  }

  $value = Normalize-EnvValue $Values[$Name]
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "'$Name' en $FileLabel está vacío o contiene solo espacios."
  }

  return $value
}

function Invoke-VercelJson {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Endpoint,
    [ValidateSet('GET', 'PATCH', 'POST', 'DELETE')]
    [string]$Method = 'GET',
    [string]$InputFile
  )

  $arguments = @('vercel', 'api', $Endpoint, '--raw')

  if ($Method -ne 'GET') {
    $arguments += @('-X', $Method)
  }

  if ($InputFile) {
    $arguments += @('-H', 'Content-Type: application/json', '--input', $InputFile)
  }

  $raw = & npx @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Falló la llamada Vercel API: $Endpoint"
  }

  return $raw | ConvertFrom-Json
}

function Get-DeploymentRecord {
  param(
    [Parameter(Mandatory = $true)]
    [string]$UrlOrId
  )

  $inspectPath = Join-Path (Get-OpsRepoRoot) 'scripts\ops\.inspect.json'

  try {
    & npx vercel inspect $UrlOrId --format=json | Set-Content -LiteralPath $inspectPath -Encoding utf8
    if ($LASTEXITCODE -ne 0) {
      throw "No se pudo inspeccionar '$UrlOrId'."
    }

    return Get-Content -LiteralPath $inspectPath -Raw | ConvertFrom-Json
  } finally {
    if (Test-Path -LiteralPath $inspectPath) {
      Remove-Item -LiteralPath $inspectPath -Force
    }
  }
}

function Get-PreviewAliasRecord {
  param(
    [Parameter(Mandatory = $true)]
    [string]$UrlOrId
  )

  $deployment = Get-DeploymentRecord -UrlOrId $UrlOrId
  $aliasName = $null

  if ($deployment.aliases -and $deployment.aliases.Count -gt 0) {
    $aliasName = $deployment.aliases[0]
  } elseif ($deployment.meta -and $deployment.meta.branchAlias) {
    $aliasName = $deployment.meta.branchAlias
  }

  if ([string]::IsNullOrWhiteSpace($aliasName)) {
    throw "No se pudo resolver un alias de preview para '$UrlOrId'."
  }

  $metadata = Get-OpsProjectMetadata
  $endpoint = "/v4/aliases/$($aliasName)?teamId=$($metadata.orgId)"
  $alias = Invoke-VercelJson -Endpoint $endpoint

  return [pscustomobject]@{
    Alias = $alias
    AliasName = $aliasName
    Deployment = $deployment
  }
}

function Get-ShareUrlFromAlias {
  param(
    [Parameter(Mandatory = $true)]
    [object]$AliasRecord
  )

  if (-not ($AliasRecord.PSObject.Properties.Name -contains 'protectionBypass')) {
    return $null
  }

  if (-not $AliasRecord.protectionBypass) {
    return $null
  }

  foreach ($entry in $AliasRecord.protectionBypass.PSObject.Properties) {
    $secret = $entry.Name
    $details = $entry.Value

    if ($details.scope -ne 'shareable-link') {
      continue
    }

    if ($details.expires -and [double]$details.expires -lt [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()) {
      continue
    }

    return "https://$($AliasRecord.alias)?_vercel_share=$secret"
  }

  return $null
}
