param(
  [Parameter(Mandatory = $true)]
  [string]$Url,
  [ValidateRange(1, 63072000)]
  [int]$TtlSeconds = 82800
)

. (Join-Path $PSScriptRoot '_common.ps1')

$resolved = Get-PreviewAliasRecord -UrlOrId $Url
$existing = Get-ShareLinkInfoFromAlias -AliasRecord $resolved.Alias

if ($existing -and -not $existing.IsExpired) {
  Write-Output $existing.Url
  exit 0
}

$metadata = Get-OpsProjectMetadata
$tempFile = [System.IO.Path]::GetTempFileName()

try {
  if ($existing -and $existing.IsExpired) {
    $payload = @{
      ttl = $TtlSeconds
      revoke = @{
        secret = $existing.Secret
        regenerate = $true
      }
    }
  } else {
    $payload = @{ ttl = $TtlSeconds }
  }

  $json = $payload | ConvertTo-Json -Compress
  $encoding = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($tempFile, $json, $encoding)
  $endpoint = "/aliases/$($resolved.Alias.uid)/protection-bypass?teamId=$($metadata.orgId)"
  try {
    [void](Invoke-VercelJson -Endpoint $endpoint -Method PATCH -InputFile $tempFile)
  } catch {
    $fallbackRecord = Get-PreviewAliasRecord -UrlOrId $resolved.Alias.alias
    $fallbackShare = Get-ShareLinkInfoFromAlias -AliasRecord $fallbackRecord.Alias

    if ($fallbackShare -and -not $fallbackShare.IsExpired) {
      Write-Output $fallbackShare.Url
      exit 0
    }

    throw
  }
} finally {
  if (Test-Path -LiteralPath $tempFile) {
    Remove-Item -LiteralPath $tempFile -Force
  }
}

$reloaded = Get-PreviewAliasRecord -UrlOrId $resolved.Alias.alias
$shareInfo = Get-ShareLinkInfoFromAlias -AliasRecord $reloaded.Alias

if (-not $shareInfo -or $shareInfo.IsExpired) {
  throw "No se pudo derivar la share URL para '$($resolved.Alias.alias)'."
}

Write-Output $shareInfo.Url
