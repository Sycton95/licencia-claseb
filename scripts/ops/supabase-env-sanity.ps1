param(
  [Parameter(Mandatory = $true)]
  [string]$ClientEnvFile,
  [Parameter(Mandatory = $true)]
  [string]$ServerEnvFile
)

. (Join-Path $PSScriptRoot '_common.ps1')

$clientValues = Get-EnvFileValueMap -Path $ClientEnvFile
$serverValues = Get-EnvFileValueMap -Path $ServerEnvFile

$checks = @(
  [pscustomobject]@{ Name = 'VITE_SUPABASE_URL'; Value = Get-RequiredEnvValue -Values $clientValues -Name 'VITE_SUPABASE_URL' -FileLabel $ClientEnvFile; Source = $ClientEnvFile },
  [pscustomobject]@{ Name = 'VITE_SUPABASE_PUBLISHABLE_KEY'; Value = Get-RequiredEnvValue -Values $clientValues -Name 'VITE_SUPABASE_PUBLISHABLE_KEY' -FileLabel $ClientEnvFile; Source = $ClientEnvFile },
  [pscustomobject]@{ Name = 'SUPABASE_SERVICE_ROLE_KEY'; Value = Get-RequiredEnvValue -Values $serverValues -Name 'SUPABASE_SERVICE_ROLE_KEY' -FileLabel $ServerEnvFile; Source = $ServerEnvFile }
)

$rows = foreach ($check in $checks) {
  [pscustomobject]@{
    name = $check.Name
    source = $check.Source
    length = $check.Value.Length
    trimmed = $true
  }
}

$rows | Format-Table -AutoSize
