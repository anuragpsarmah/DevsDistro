$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

git -C $repoRoot config core.hooksPath .githooks

Write-Host "Configured git hooks for this clone: core.hooksPath=.githooks"
Write-Host "pre-commit: format staged frontend/backend source files and re-stage automatically"
Write-Host "pre-push: frontend/backend tests"
