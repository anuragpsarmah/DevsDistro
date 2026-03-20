param(
  [string]$Remote = "anurag@161.97.91.246",
  [string]$Key = "$HOME\.ssh\contabo-server",
  [string]$SinceDocker = "48h",
  [string]$SinceJournal = "48 hours ago"
)

$ErrorActionPreference = "Stop"

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $HOME "devsdistro-logs-$stamp"

New-Item -ItemType Directory -Path $outDir | Out-Null

Write-Host "==> Pulling backend API logs (last $SinceDocker)..."
try {
  ssh -i $Key $Remote "docker logs --since='$SinceDocker' backend-blue 2>&1 || docker logs --since='$SinceDocker' backend-green 2>&1" |
    Out-File -Encoding utf8 (Join-Path $outDir "backend-api.log")
} catch {
  "WARNING: Could not pull API logs`r`n$($_.Exception.Message)" |
    Out-File -Encoding utf8 (Join-Path $outDir "backend-api.log")
}

Write-Host "==> Pulling worker logs..."
try {
  ssh -i $Key $Remote "docker logs --since='$SinceDocker' backend-worker 2>&1" |
    Out-File -Encoding utf8 (Join-Path $outDir "backend-worker.log")
} catch {
  "WARNING: Could not pull worker logs`r`n$($_.Exception.Message)" |
    Out-File -Encoding utf8 (Join-Path $outDir "backend-worker.log")
}

Write-Host "==> Pulling cities logs..."
try {
  ssh -i $Key $Remote "docker logs --since='$SinceDocker' cities 2>&1" |
    Out-File -Encoding utf8 (Join-Path $outDir "cities.log")
} catch {
  "WARNING: Could not pull cities logs`r`n$($_.Exception.Message)" |
    Out-File -Encoding utf8 (Join-Path $outDir "cities.log")
}

Write-Host "==> Pulling Nginx logs..."
try {
  ssh -i $Key $Remote "journalctl -u nginx --since='$SinceJournal' --no-pager 2>/dev/null; tail -n +1 /var/log/nginx/access.log /var/log/nginx/error.log 2>/dev/null || true" |
    Out-File -Encoding utf8 (Join-Path $outDir "nginx.log")
} catch {
  "WARNING: Could not pull Nginx logs`r`n$($_.Exception.Message)" |
    Out-File -Encoding utf8 (Join-Path $outDir "nginx.log")
}

Write-Host "==> Done. Logs saved to $outDir"
Get-ChildItem $outDir | Select-Object Name, Length, LastWriteTime
