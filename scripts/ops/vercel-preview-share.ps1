param(
  [Parameter(Mandatory = $true)]
  [string]$Url,
  [ValidateRange(1, 63072000)]
  [int]$TtlSeconds = 82800
)

. (Join-Path $PSScriptRoot '_common.ps1')

$resolved = Get-PreviewAliasRecord -UrlOrId $Url
$existing = Get-ShareUrlFromAlias -AliasRecord $resolved.Alias

if ($existing) {
  Write-Output $existing
  exit 0
}

$metadata = Get-OpsProjectMetadata
$tempFile = [System.IO.Path]::GetTempFileName()

try {
  $json = @{ ttl = $TtlSeconds } | ConvertTo-Json -Compress
  $encoding = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($tempFile, $json, $encoding)
  $endpoint = "/aliases/$($resolved.Alias.uid)/protection-bypass?teamId=$($metadata.orgId)"
  [void](Invoke-VercelJson -Endpoint $endpoint -Method PATCH -InputFile $tempFile)
} finally {
  if (Test-Path -LiteralPath $tempFile) {
    Remove-Item -LiteralPath $tempFile -Force
  }
}

$reloaded = Get-PreviewAliasRecord -UrlOrId $resolved.Alias.alias
$shareUrl = Get-ShareUrlFromAlias -AliasRecord $reloaded.Alias

if (-not $shareUrl) {
  throw "No se pudo derivar la share URL para '$($resolved.Alias.alias)'."
}

Write-Output $shareUrl
