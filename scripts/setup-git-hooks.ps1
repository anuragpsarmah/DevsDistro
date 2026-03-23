$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

git -C $repoRoot config core.hooksPath .githooks

Write-Host "Configured git hooks for this clone: core.hooksPath=.githooks"
Write-Host "pre-commit: format check, then auto-format if needed and stop for re-commit"
Write-Host "pre-push: frontend/backend format:check and test"
