$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LanguagesRoot = $env:MGC_LANGUAGES_PATH
if (-not $LanguagesRoot) { $LanguagesRoot = Join-Path (Split-Path $Root -Parent) 'mgc-languages' }
$rc = 0

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is not installed or not in PATH.' }
& docker info *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker daemon is not running.' }

Write-Host '=== Stopping MGC Languages VM ===' -ForegroundColor Cyan
$langEnv = Join-Path $LanguagesRoot '.env.vm'
if ((Test-Path -LiteralPath $langEnv -PathType Leaf) -and (Test-Path -LiteralPath (Join-Path $LanguagesRoot 'docker-compose.lan.yml')) -and (Test-Path -LiteralPath (Join-Path $LanguagesRoot 'docker-compose.vm.yml'))) {
    Push-Location $LanguagesRoot
    try {
        & docker compose --env-file .env.vm -f docker-compose.lan.yml -f docker-compose.vm.yml down --remove-orphans
        if ($LASTEXITCODE -eq 0) {
            Write-Host '[GO] MGC Languages stopped. PostgreSQL volume was preserved.' -ForegroundColor Green
        } else {
            Write-Host '[NO-GO] Failed to stop MGC Languages.' -ForegroundColor Red
            $rc = 1
        }
    } finally { Pop-Location }
} else {
    Write-Host '[INFO] MGC Languages VM profile is not initialized; nothing to stop.' -ForegroundColor DarkGray
}

Write-Host ''
Write-Host '=== Stopping Okno v Kitai VM ===' -ForegroundColor Cyan
$oknoEnv = Join-Path $Root '.env.vm'
if ((Test-Path -LiteralPath $oknoEnv -PathType Leaf) -and (Test-Path -LiteralPath (Join-Path $Root 'compose.yaml')) -and (Test-Path -LiteralPath (Join-Path $Root 'compose.vm.yaml'))) {
    Push-Location $Root
    try {
        & docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml down --remove-orphans
        if ($LASTEXITCODE -eq 0) {
            Write-Host '[GO] Okno v Kitai stopped. Runtime data volume was preserved.' -ForegroundColor Green
        } else {
            Write-Host '[NO-GO] Failed to stop Okno v Kitai.' -ForegroundColor Red
            $rc = 1
        }
    } finally { Pop-Location }
} else {
    Write-Host '[INFO] Okno VM profile is not initialized; nothing to stop.' -ForegroundColor DarkGray
}

Write-Host ''
if ($rc -eq 0) {
    Write-Host '[GO] Both VM stacks are stopped. No Docker volumes were deleted.' -ForegroundColor Green
} else {
    Write-Host '[NO-GO] One or more VM stacks could not be stopped cleanly.' -ForegroundColor Red
}
exit $rc
