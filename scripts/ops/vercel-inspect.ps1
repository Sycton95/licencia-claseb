param(
  [Parameter(Mandatory = $true)]
  [string]$UrlOrId
)

. (Join-Path $PSScriptRoot '_common.ps1')

$deployment = Get-DeploymentRecord -UrlOrId $UrlOrId
$meta = $null
if ($deployment.PSObject.Properties.Name -contains 'meta') {
  $meta = $deployment.meta
}

[pscustomobject]@{
  id = $deployment.id
  url = "https://$($deployment.url)"
  target = if ($deployment.target) { $deployment.target } else { 'preview' }
  state = $deployment.readyState
  created = [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$deployment.createdAt).ToString('u')
  aliases = @($deployment.aliases)
  branch = if ($meta) { $meta.githubCommitRef } else { $null }
  commit = if ($meta) { $meta.githubCommitSha } else { $null }
  project = $deployment.name
} | ConvertTo-Json -Depth 4
