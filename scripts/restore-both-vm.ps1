param(
    [string]$BackupPath
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LanguagesRoot = $env:MGC_LANGUAGES_PATH
if (-not $LanguagesRoot) { $LanguagesRoot = Join-Path (Split-Path $Root -Parent) 'mgc-languages' }
$BackupRoot = $env:MGC_VM_BACKUP_ROOT
if (-not $BackupRoot) { $BackupRoot = Join-Path (Split-Path $Root -Parent) 'vm-backups' }
$SafetyRoot = Join-Path $BackupRoot 'pre-restore'
$PgTmp = '/tmp/mgc_languages_restore.dump'

function Assert-NativeSuccess([string]$Message) {
    if ($LASTEXITCODE -ne 0) { throw $Message }
}

function Wait-Ready([string]$Url, [string]$Name) {
    for ($i = 0; $i -lt 90; $i++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
                Write-Host "[GO] $Name readiness passed." -ForegroundColor Green
                return
            }
        } catch {}
        Start-Sleep -Seconds 2
    }
    throw "$Name did not become ready after restore."
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is not installed or not in PATH.' }
& docker info *> $null
Assert-NativeSuccess 'Docker daemon is not running.'

$oknoEnv = Join-Path $Root '.env.vm'
$langEnv = Join-Path $LanguagesRoot '.env.vm'
if (-not (Test-Path -LiteralPath $oknoEnv -PathType Leaf)) { throw 'Okno .env.vm is missing.' }
if (-not (Test-Path -LiteralPath $langEnv -PathType Leaf)) { throw 'MGC Languages .env.vm is missing.' }

if (-not $BackupPath) { $BackupPath = $env:MGC_VM_RESTORE_PATH }
if (-not $BackupPath) {
    $latest = Get-ChildItem -LiteralPath $BackupRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^\d{8}T\d{6}Z$' } |
        Sort-Object Name -Descending |
        Select-Object -First 1
    if ($latest) { $BackupPath = $latest.FullName }
}
if (-not $BackupPath) { throw "No backup directory was supplied or found in $BackupRoot." }
$BackupPath = (Resolve-Path -LiteralPath $BackupPath).Path

foreach ($required in @('okno.sqlite','mgc_languages.dump','manifest.json','checksums.sha256')) {
    $path = Join-Path $BackupPath $required
    if (-not (Test-Path -LiteralPath $path -PathType Leaf) -or (Get-Item -LiteralPath $path).Length -le 0) {
        throw "Required backup file is missing or empty: $required"
    }
}

$checksumFile = Join-Path $BackupPath 'checksums.sha256'
foreach ($line in [System.IO.File]::ReadLines($checksumFile)) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $parts = $line -split '\s{2,}', 2
    if ($parts.Count -ne 2) { throw "Invalid checksum line: $line" }
    $relative = $parts[1].TrimStart([char[]]'./\')
    $target = Join-Path $BackupPath $relative
    if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw "Checksum target is missing: $relative" }
    $actual = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $parts[0].ToLowerInvariant()) { throw "SHA-256 verification failed for $relative." }
}
Write-Host '[GO] Backup SHA-256 verification passed.' -ForegroundColor Green

$manifest = Get-Content -LiteralPath (Join-Path $BackupPath 'manifest.json') -Raw | ConvertFrom-Json
if ($manifest.profile -ne 'dual-vm-cpu-only-no-ai') { throw 'Backup manifest profile is not dual-vm-cpu-only-no-ai.' }

$confirm = $env:MGC_VM_RESTORE_CONFIRM
if ($confirm -ne 'RESTORE') {
    Write-Host ''
    Write-Host 'This will replace BOTH pilot databases with:' -ForegroundColor Yellow
    Write-Host "  $BackupPath" -ForegroundColor Yellow
    Write-Host 'A fresh pre-restore safety backup will be created first.' -ForegroundColor Yellow
    $confirm = Read-Host 'Type RESTORE to continue'
}
if ($confirm -ne 'RESTORE') { Write-Host 'Restore cancelled.'; exit 2 }

$oknoArgs = @('compose','--env-file','.env.vm','-f','compose.yaml','-f','compose.vm.yaml')
$langArgs = @('compose','--env-file','.env.vm','-f','docker-compose.lan.yml','-f','docker-compose.vm.yml')

Push-Location $Root
try { $oknoCid = ([string](& docker @oknoArgs ps -q china-auto-radar)).Trim() } finally { Pop-Location }
Push-Location $LanguagesRoot
try { $dbCid = ([string](& docker @langArgs ps -q db)).Trim() } finally { Pop-Location }
if (-not $oknoCid) { throw 'Okno v Kitai container is not running. Start the VM profile first.' }
if (-not $dbCid) { throw 'MGC Languages PostgreSQL container is not running. Start the VM profile first.' }

New-Item -ItemType Directory -Force -Path $SafetyRoot | Out-Null
Write-Host '=== Creating pre-restore safety backup ===' -ForegroundColor Cyan
$previousBackupRoot = $env:MGC_VM_BACKUP_ROOT
$previousIncludeSecrets = $env:MGC_VM_BACKUP_INCLUDE_SECRETS
try {
    $env:MGC_VM_BACKUP_ROOT = $SafetyRoot
    $env:MGC_VM_BACKUP_INCLUDE_SECRETS = 'NO'
    & (Join-Path $PSScriptRoot 'backup-both-vm.ps1')
} finally {
    $env:MGC_VM_BACKUP_ROOT = $previousBackupRoot
    $env:MGC_VM_BACKUP_INCLUDE_SECRETS = $previousIncludeSecrets
}
$SafetyPath = (Get-ChildItem -LiteralPath $SafetyRoot -Directory | Where-Object { $_.Name -match '^\d{8}T\d{6}Z$' } | Sort-Object Name -Descending | Select-Object -First 1).FullName
if (-not $SafetyPath) { throw 'Pre-restore safety backup was not created.' }
Write-Host "[GO] Safety backup: $SafetyPath" -ForegroundColor Green

try {
    & docker cp (Join-Path $BackupPath 'mgc_languages.dump') "${dbCid}:$PgTmp"
    Assert-NativeSuccess 'Could not stage PostgreSQL restore dump.'
    & docker exec $dbCid pg_restore --list $PgTmp *> $null
    Assert-NativeSuccess 'PostgreSQL restore dump validation failed.'

    $oknoImage = ([string](& docker inspect --format '{{.Image}}' $oknoCid)).Trim()
    Assert-NativeSuccess 'Could not inspect Okno container image.'
    if (-not $oknoImage) { throw 'Could not resolve Okno container image.' }

    Write-Host '=== Stopping application writers ===' -ForegroundColor Cyan
    Push-Location $Root
    try {
        & docker @oknoArgs stop china-auto-radar-scheduler china-auto-radar *> $null
        Assert-NativeSuccess 'Could not stop Okno services.'
    } finally { Pop-Location }

    Push-Location $LanguagesRoot
    try {
        & docker @langArgs stop nginx app *> $null
        Assert-NativeSuccess 'Could not stop MGC Languages application services.'
    } finally { Pop-Location }

    $sqliteRestore = @'
set -eu
cp /restore/okno.sqlite /data/okno.sqlite.restore
node --input-type=module -e 'import { DatabaseSync } from "node:sqlite"; const db=new DatabaseSync("/data/okno.sqlite.restore",{readOnly:true}); try { const row=db.prepare("PRAGMA integrity_check").get(); if (!row || row.integrity_check!=="ok") process.exit(2); } finally { db.close(); }'
rm -f /data/okno.sqlite-wal /data/okno.sqlite-shm
mv /data/okno.sqlite.restore /data/okno.sqlite
'@
    $mountArg = "type=bind,source=$BackupPath,target=/restore,readonly"
    & docker run --rm --volumes-from $oknoCid --mount $mountArg $oknoImage sh -lc $sqliteRestore
    Assert-NativeSuccess "Okno SQLite restore failed. Safety backup: $SafetyPath"

    $postgresRestore = @'
set -eu
pg_restore --list /tmp/mgc_languages_restore.dump >/dev/null
dropdb --if-exists --force -U "$POSTGRES_USER" "$POSTGRES_DB"
createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges /tmp/mgc_languages_restore.dump
'@
    & docker exec $dbCid sh -lc $postgresRestore
    Assert-NativeSuccess "PostgreSQL restore failed. Safety backup: $SafetyPath"

    & docker exec $dbCid rm -f $PgTmp *> $null

    Write-Host '=== Starting restored services ===' -ForegroundColor Cyan
    Push-Location $Root
    try {
        & docker @oknoArgs up -d china-auto-radar china-auto-radar-scheduler *> $null
        Assert-NativeSuccess 'Could not start restored Okno services.'
    } finally { Pop-Location }

    Push-Location $LanguagesRoot
    try {
        & docker @langArgs up -d db app nginx *> $null
        Assert-NativeSuccess 'Could not start restored MGC Languages services.'
    } finally { Pop-Location }

    Wait-Ready 'http://127.0.0.1:3000/api/ready' 'Okno v Kitai'
    Wait-Ready 'http://127.0.0.1:8080/health/ready' 'MGC Languages'

    Write-Host ''
    Write-Host '[GO] Dual VM restore completed successfully.' -ForegroundColor Green
    Write-Host "Restored from: $BackupPath"
    Write-Host "Pre-restore safety backup: $SafetyPath"
    Write-Host 'Runtime configuration, audit logs and .env.vm secrets were intentionally preserved.'
} catch {
    Write-Error "Restore failed. Safety backup is available at: $SafetyPath`n$($_.Exception.Message)"
    try { Push-Location $Root; & docker @oknoArgs up -d china-auto-radar china-auto-radar-scheduler *> $null } catch {} finally { Pop-Location }
    try { Push-Location $LanguagesRoot; & docker @langArgs up -d db app nginx *> $null } catch {} finally { Pop-Location }
    throw
} finally {
    if ($dbCid) { & docker exec $dbCid rm -f $PgTmp *> $null }
}
