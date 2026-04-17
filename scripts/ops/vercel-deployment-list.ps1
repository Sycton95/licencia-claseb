param(
  [string]$ProjectSlug = 'licencia-claseb',
  [ValidateRange(1, 20)]
  [int]$Limit = 10,
  [switch]$IncludeProduction
)

. (Join-Path $PSScriptRoot '_common.ps1')

$metadata = Get-OpsProjectMetadata
$endpoint = "/v6/deployments?projectId=$($metadata.projectId)&limit=$Limit"
$payload = Invoke-VercelJson -Endpoint $endpoint

$deployments = @($payload.deployments)
if (-not $IncludeProduction) {
  $deployments = @($deployments | Where-Object { $_.target -ne 'production' })
}

$rows = $deployments | Select-Object `
  @{ Name = 'created'; Expression = { [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$_.created).ToString('u') } }, `
  @{ Name = 'target'; Expression = { if ($_.target) { $_.target } else { 'preview' } } }, `
  @{ Name = 'state'; Expression = { $_.readyState } }, `
  @{ Name = 'url'; Expression = { "https://$($_.url)" } }, `
  @{ Name = 'branchAlias'; Expression = { $_.meta.branchAlias } }, `
  @{ Name = 'branch'; Expression = { $_.meta.githubCommitRef } }, `
  @{ Name = 'commit'; Expression = { $_.meta.githubCommitSha } }

if ($rows.Count -eq 0) {
  Write-Output "No se encontraron deployments para '$ProjectSlug' con el filtro actual."
  exit 0
}

$rows | Format-Table -AutoSize
