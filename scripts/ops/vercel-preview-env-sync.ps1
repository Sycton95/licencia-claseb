param(
  [Parameter(Mandatory = $true)]
  [string]$Branch,
  [Parameter(Mandatory = $true)]
  [string]$ClientEnvFile,
  [Parameter(Mandatory = $true)]
  [string]$ServerEnvFile
)

. (Join-Path $PSScriptRoot '_common.ps1')

$safeBranch = Assert-CodexBranch -Branch $Branch
$clientValues = Get-EnvFileValueMap -Path $ClientEnvFile
$serverValues = Get-EnvFileValueMap -Path $ServerEnvFile

$envMap = [ordered]@{
  VITE_SUPABASE_URL = Get-RequiredEnvValue -Values $clientValues -Name 'VITE_SUPABASE_URL' -FileLabel $ClientEnvFile
  VITE_SUPABASE_PUBLISHABLE_KEY = Get-RequiredEnvValue -Values $clientValues -Name 'VITE_SUPABASE_PUBLISHABLE_KEY' -FileLabel $ClientEnvFile
  SUPABASE_SERVICE_ROLE_KEY = Get-RequiredEnvValue -Values $serverValues -Name 'SUPABASE_SERVICE_ROLE_KEY' -FileLabel $ServerEnvFile
}

$allowedNames = Get-AllowedPreviewEnvNames
foreach ($name in $envMap.Keys) {
  if ($allowedNames -notcontains $name) {
    throw "La variable '$name' no está permitida por este wrapper."
  }

  $value = $envMap[$name]
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "La variable '$name' no puede sincronizarse vacía."
  }

  $arguments = @(
    'vercel', 'env', 'add', $name, 'preview', $safeBranch,
    '--value', $value, '--yes', '--force'
  )

  & npx @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Falló la sincronización de '$name' para '$safeBranch'."
  }
}

Write-Output "Sincronización preview completada para $safeBranch"
