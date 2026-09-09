$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LanguagesRoot = $env:MGC_LANGUAGES_PATH
if (-not $LanguagesRoot) { $LanguagesRoot = Join-Path (Split-Path $Root -Parent) 'mgc-languages' }
$BackupRoot = $env:MGC_VM_BACKUP_ROOT
if (-not $BackupRoot) { $BackupRoot = Join-Path (Split-Path $Root -Parent) 'vm-backups' }

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Required command not found: $Name" }
}

function Assert-CleanMain([string]$Repo, [string]$Name) {
    if (-not (Test-Path -LiteralPath (Join-Path $Repo '.git'))) { throw "$Name is not a Git working copy: $Repo" }
    $branch = ([string](& git -C $Repo branch --show-current)).Trim()
    if ($LASTEXITCODE -ne 0 -or $branch -ne 'main') { throw "$Name must be on main, current branch: $branch" }
    $dirty = [string](& git -C $Repo -c core.fileMode=false status --porcelain)
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect $Name working tree." }
    if (-not [string]::IsNullOrWhiteSpace($dirty)) {
        Write-Host "[NO-GO] $Name has local changes or untracked files. Update will not overwrite them." -ForegroundColor Red
        & git -C $Repo -c core.fileMode=false status --short
        throw "$Name working tree is not clean."
    }
}

function Fetch-And-AssertFastForward([string]$Repo, [string]$Name) {
    Write-Host "Fetching $Name..." -ForegroundColor Cyan
    & git -C $Repo fetch origin main
    if ($LASTEXITCODE -ne 0) { throw "Could not fetch origin/main for $Name." }
    & git -C $Repo rev-parse --verify origin/main *> $null
    if ($LASTEXITCODE -ne 0) { throw "origin/main is unavailable for $Name." }
    & git -C $Repo merge-base --is-ancestor HEAD origin/main
    if ($LASTEXITCODE -ne 0) { throw "$Name cannot fast-forward cleanly to origin/main. No pull was performed." }
}

Assert-Command 'git'
Assert-Command 'docker'
& docker info *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker daemon is not running.' }
if (-not (Test-Path -LiteralPath $LanguagesRoot)) { throw "MGC Languages was not found at: $LanguagesRoot" }

Assert-CleanMain $Root 'Okno v Kitai'
Assert-CleanMain $LanguagesRoot 'MGC Languages'
Fetch-And-AssertFastForward $Root 'Okno v Kitai'
Fetch-And-AssertFastForward $LanguagesRoot 'MGC Languages'

$oknoBefore = ([string](& git -C $Root rev-parse HEAD)).Trim()
$langBefore = ([string](& git -C $LanguagesRoot rev-parse HEAD)).Trim()

Write-Host ''
Write-Host '=== Mandatory pre-update backup ===' -ForegroundColor Cyan
$backupScript = Join-Path $Root 'scripts\backup-both-vm.ps1'
& $backupScript
if ($LASTEXITCODE -ne 0) { throw 'Verified pre-update backup failed. Update aborted.' }

$backupDir = Get-ChildItem -LiteralPath $BackupRoot -Directory -ErrorAction Stop |
    Where-Object { $_.Name -match '^20\d{6}T\d{6}Z$' } |
    Sort-Object Name |
    Select-Object -Last 1
if (-not $backupDir -or -not (Test-Path -LiteralPath (Join-Path $backupDir.FullName 'okno.sqlite')) -or -not (Test-Path -LiteralPath (Join-Path $backupDir.FullName 'mgc_languages.dump'))) {
    throw 'Verified pre-update backup could not be located. Update aborted.'
}
Write-Host "[GO] Pre-update backup: $($backupDir.FullName)" -ForegroundColor Green

Write-Host ''
Write-Host '=== Fast-forwarding both repositories ===' -ForegroundColor Cyan
& git -C $Root pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw 'Okno v Kitai pull failed. Pre-update backup is preserved.' }
& git -C $LanguagesRoot pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw 'MGC Languages pull failed. Pre-update backup is preserved.' }

$oknoAfter = ([string](& git -C $Root rev-parse HEAD)).Trim()
$langAfter = ([string](& git -C $LanguagesRoot rev-parse HEAD)).Trim()

@(
    "updated_utc=$([DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ'))",
    "okno_before=$oknoBefore",
    "okno_after=$oknoAfter",
    "languages_before=$langBefore",
    "languages_after=$langAfter",
    'status=pulled-awaiting-readiness'
) | Set-Content -LiteralPath (Join-Path $backupDir.FullName 'update-result.txt') -Encoding ascii

Write-Host ''
Write-Host '=== Rebuilding/recreating CPU-only VM profiles ===' -ForegroundColor Cyan
$startScript = Join-Path $Root 'scripts\start-both-vm.ps1'
$statusScript = Join-Path $Root 'scripts\status-both-vm.ps1'
try {
    & $startScript
    if ($LASTEXITCODE -ne 0) { throw 'Updated services did not start cleanly.' }
    & $statusScript
    if ($LASTEXITCODE -ne 0) { throw 'Update completed, but readiness verification failed.' }
} catch {
    Write-Host "[NO-GO] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Pre-update backup remains at: $($backupDir.FullName)" -ForegroundColor Yellow
    Write-Host 'No automatic data rollback was attempted.' -ForegroundColor Yellow
    throw
}

@(
    "verified_utc=$([DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ'))",
    'status=success'
) | Add-Content -LiteralPath (Join-Path $backupDir.FullName 'update-result.txt') -Encoding ascii

Write-Host ''
Write-Host '[GO] Both VM services were updated and passed readiness checks.' -ForegroundColor Green
Write-Host "Okno:      $oknoBefore -> $oknoAfter"
Write-Host "Languages: $langBefore -> $langAfter"
Write-Host "Rollback data source if ever needed: $($backupDir.FullName)" -ForegroundColor Yellow
