param(
  [string]$Remote = "anurag@161.97.91.246",
  [string]$Key = "$HOME\.ssh\contabo-server",
  [string]$SinceDocker = "48h",
  [string]$SinceJournal = "48 hours ago",
  [string[]]$Logs = @()
)

$ErrorActionPreference = "Stop"

$allTargets = @("backend-api", "backend-worker", "cities", "nginx")
$targetFiles = @{
  "backend-api" = "backend-api.log"
  "backend-worker" = "backend-worker.log"
  "cities" = "cities.log"
  "nginx" = "nginx.log"
}
$targetAliases = @{
  "all" = $allTargets
  "api" = @("backend-api")
  "backend" = @("backend-api")
  "backend-api" = @("backend-api")
  "worker" = @("backend-worker")
  "backend-worker" = @("backend-worker")
  "cities" = @("cities")
  "nginx" = @("nginx")
}

function Resolve-LogTargets([string[]]$Requested) {
  if (-not $Requested -or $Requested.Count -eq 0) {
    $Requested = @("all")
  }

  $resolved = New-Object System.Collections.Generic.List[string]

  foreach ($item in $Requested) {
    $normalized = $item.Trim().ToLowerInvariant()

    if (-not $targetAliases.ContainsKey($normalized)) {
      $valid = ($targetAliases.Keys | Sort-Object -Unique) -join ", "
      throw "Unknown log target '$item'. Valid values: $valid"
    }

    foreach ($target in $targetAliases[$normalized]) {
      if (-not $resolved.Contains($target)) {
        $resolved.Add($target)
      }
    }
  }

  return @($resolved)
}

function Quote-ForBash([string]$Value) {
  return "'" + $Value.Replace("'", "'""'""'") + "'"
}

$selectedTargets = Resolve-LogTargets $Logs

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$logsRoot = Join-Path $repoRoot "logs"
$outDir = Join-Path $logsRoot "devsdistro-logs-$stamp"
$sessionToken = [guid]::NewGuid().ToString("N")
$startPrefix = "__DEVS_DISTRO_LOG_START__:${sessionToken}:"
$endPrefix = "__DEVS_DISTRO_LOG_END__:${sessionToken}:"

New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$remoteArgs = @($SinceDocker, $SinceJournal, $sessionToken) + $selectedTargets
$remoteCommand = "bash -s -- " + (($remoteArgs | ForEach-Object { Quote-ForBash $_ }) -join " ")

$remoteScript = @'
set -uo pipefail

since_docker="$1"
since_journal="$2"
marker_token="$3"
shift 3

emit_start() {
  printf '__DEVS_DISTRO_LOG_START__:%s:%s\n' "$marker_token" "$1"
}

emit_end() {
  printf '__DEVS_DISTRO_LOG_END__:%s:%s\n' "$marker_token" "$1"
}

pull_backend_api() {
  docker logs --since="$since_docker" backend-blue 2>&1 ||
    docker logs --since="$since_docker" backend-green 2>&1 ||
    printf 'WARNING: Could not pull API logs\n'
}

pull_backend_worker() {
  docker logs --since="$since_docker" backend-worker 2>&1 ||
    printf 'WARNING: Could not pull worker logs\n'
}

pull_cities() {
  docker logs --since="$since_docker" cities 2>&1 ||
    printf 'WARNING: Could not pull cities logs\n'
}

pull_nginx() {
  journalctl -u nginx --since="$since_journal" --no-pager 2>/dev/null
  tail -n +1 /var/log/nginx/access.log /var/log/nginx/error.log 2>/dev/null ||
    true
}

for target in "$@"; do
  case "$target" in
    backend-api)
      emit_start "backend-api.log"
      pull_backend_api
      emit_end "backend-api.log"
      ;;
    backend-worker)
      emit_start "backend-worker.log"
      pull_backend_worker
      emit_end "backend-worker.log"
      ;;
    cities)
      emit_start "cities.log"
      pull_cities
      emit_end "cities.log"
      ;;
    nginx)
      emit_start "nginx.log"
      pull_nginx
      emit_end "nginx.log"
      ;;
  esac
done
'@

Write-Host "==> Pulling logs: $($selectedTargets -join ', ')"

try {
  $outputLines = @($remoteScript | & ssh -T -i $Key $Remote $remoteCommand)

  if ($LASTEXITCODE -ne 0) {
    throw "ssh exited with code $LASTEXITCODE"
  }

  $logContents = @{}
  $currentFile = $null

  foreach ($line in $outputLines) {
    if ($line.StartsWith($startPrefix)) {
      $currentFile = $line.Substring($startPrefix.Length)
      if (-not $logContents.ContainsKey($currentFile)) {
        $logContents[$currentFile] = New-Object System.Collections.Generic.List[string]
      }
      continue
    }

    if ($line.StartsWith($endPrefix)) {
      $currentFile = $null
      continue
    }

    if ($null -ne $currentFile) {
      $logContents[$currentFile].Add($line)
    }
  }

  foreach ($target in $selectedTargets) {
    $fileName = $targetFiles[$target]
    $path = Join-Path $outDir $fileName

    if ($logContents.ContainsKey($fileName)) {
      Set-Content -Path $path -Encoding utf8 -Value $logContents[$fileName]
    } else {
      Set-Content -Path $path -Encoding utf8 -Value "WARNING: No output was returned for $fileName"
    }
  }
} catch {
  foreach ($target in $selectedTargets) {
    $path = Join-Path $outDir $targetFiles[$target]
    Set-Content -Path $path -Encoding utf8 -Value "WARNING: Could not pull $target logs`r`n$($_.Exception.Message)"
  }
}

Write-Host "==> Done. Logs saved to $outDir"
Get-ChildItem $outDir | Select-Object Name, Length, LastWriteTime
