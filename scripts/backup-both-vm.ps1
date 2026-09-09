$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LanguagesRoot = $env:MGC_LANGUAGES_PATH
if (-not $LanguagesRoot) { $LanguagesRoot = Join-Path (Split-Path $Root -Parent) 'mgc-languages' }
$BackupRoot = $env:MGC_VM_BACKUP_ROOT
if (-not $BackupRoot) { $BackupRoot = Join-Path (Split-Path $Root -Parent) 'vm-backups' }
$RetentionDays = 14
if ($env:MGC_VM_BACKUP_RETENTION_DAYS -match '^\d+$') { $RetentionDays = [int]$env:MGC_VM_BACKUP_RETENTION_DAYS }
$IncludeSecrets = ($env:MGC_VM_BACKUP_INCLUDE_SECRETS -eq 'YES')
$Stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$Destination = Join-Path $BackupRoot $Stamp
$oknoCid = ''
$oknoTmp = ''
$dbCid = ''
$dbTmp = ''

function Assert-NativeSuccess([string]$Message) {
    if ($LASTEXITCODE -ne 0) { throw $Message }
}

function Get-GitHead([string]$Path) {
    try {
        $value = ([string](& git -C $Path rev-parse HEAD 2>$null)).Trim()
        if ($LASTEXITCODE -eq 0 -and $value) { return $value }
    } catch {}
    return 'unknown'
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is not installed or not in PATH.' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is not installed or not in PATH.' }
& docker info *> $null
Assert-NativeSuccess 'Docker daemon is not running.'

$oknoEnv = Join-Path $Root '.env.vm'
$langEnv = Join-Path $LanguagesRoot '.env.vm'
if (-not (Test-Path -LiteralPath $oknoEnv -PathType Leaf)) { throw 'Okno .env.vm is missing. Start the VM profile first.' }
if (-not (Test-Path -LiteralPath $langEnv -PathType Leaf)) { throw 'MGC Languages .env.vm is missing. Start the VM profile first.' }

New-Item -ItemType Directory -Force -Path $Destination | Out-Null

try {
    Write-Host '=== Backing up Okno v Kitai ===' -ForegroundColor Cyan
    Push-Location $Root
    try {
        $oknoArgs = @('compose','--env-file','.env.vm','-f','compose.yaml','-f','compose.vm.yaml')
        $oknoCid = ([string](& docker @oknoArgs ps -q china-auto-radar)).Trim()
        if (-not $oknoCid) { throw 'Okno v Kitai container is not running.' }
        & docker exec $oknoCid test -f /data/okno.sqlite
        Assert-NativeSuccess 'Okno SQLite database was not found in the runtime volume.'
        & docker @oknoArgs exec -T china-auto-radar node scripts/sqlite-backup.mjs
        Assert-NativeSuccess 'Okno SQLite backup command failed.'
    } finally { Pop-Location }

    $oknoTmp = ([string](& docker exec $oknoCid sh -lc 'ls -1t /data/backups/okno-*.sqlite 2>/dev/null | head -n1')).Trim()
    Assert-NativeSuccess 'Could not locate the Okno SQLite backup.'
    if (-not $oknoTmp) { throw 'Okno SQLite backup was not created.' }

    $sqliteCheck = 'import { DatabaseSync } from "node:sqlite"; const db=new DatabaseSync(process.argv[1],{readOnly:true}); try { const row=db.prepare("PRAGMA integrity_check").get(); if (!row || row.integrity_check!=="ok") process.exit(2); } finally { db.close(); }'
    & docker exec $oknoCid node --input-type=module -e $sqliteCheck $oknoTmp
    Assert-NativeSuccess 'Okno SQLite integrity_check failed.'

    $oknoOut = Join-Path $Destination 'okno.sqlite'
    & docker cp "${oknoCid}:$oknoTmp" $oknoOut
    Assert-NativeSuccess 'Could not copy the Okno SQLite backup to the host.'

    & docker exec $oknoCid test -f /data/runtime-config.json *> $null
    if ($LASTEXITCODE -eq 0) {
        & docker cp "${oknoCid}:/data/runtime-config.json" (Join-Path $Destination 'runtime-config.json')
        Assert-NativeSuccess 'Could not copy Okno runtime-config.json.'
    }

    & docker exec $oknoCid test -d /data/audit *> $null
    if ($LASTEXITCODE -eq 0) {
        & docker cp "${oknoCid}:/data/audit" (Join-Path $Destination 'okno-audit')
        Assert-NativeSuccess 'Could not copy the Okno audit directory.'
    }

    & docker exec $oknoCid rm -f $oknoTmp *> $null
    $oknoTmp = ''
    if (-not (Test-Path -LiteralPath $oknoOut -PathType Leaf) -or (Get-Item -LiteralPath $oknoOut).Length -le 0) { throw 'Okno SQLite backup is empty.' }
    Write-Host '[GO] Okno SQLite backup passed integrity_check.' -ForegroundColor Green

    Write-Host ''
    Write-Host '=== Backing up MGC Languages PostgreSQL ===' -ForegroundColor Cyan
    Push-Location $LanguagesRoot
    try {
        $langArgs = @('compose','--env-file','.env.vm','-f','docker-compose.lan.yml','-f','docker-compose.vm.yml')
        $dbCid = ([string](& docker @langArgs ps -q db)).Trim()
    } finally { Pop-Location }
    if (-not $dbCid) { throw 'MGC Languages database container is not running.' }

    $dbTmp = "/tmp/mgc_languages_$Stamp.dump"
    & docker exec $dbCid sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$1"' sh $dbTmp
    Assert-NativeSuccess 'PostgreSQL pg_dump failed.'
    & docker exec $dbCid pg_restore --list $dbTmp *> $null
    Assert-NativeSuccess 'PostgreSQL dump validation with pg_restore --list failed.'

    $dbOut = Join-Path $Destination 'mgc_languages.dump'
    & docker cp "${dbCid}:$dbTmp" $dbOut
    Assert-NativeSuccess 'Could not copy the PostgreSQL dump to the host.'
    & docker exec $dbCid rm -f $dbTmp *> $null
    $dbTmp = ''
    if (-not (Test-Path -LiteralPath $dbOut -PathType Leaf) -or (Get-Item -LiteralPath $dbOut).Length -le 0) { throw 'PostgreSQL backup is empty.' }
    Write-Host '[GO] PostgreSQL dump passed pg_restore --list validation.' -ForegroundColor Green

    if ($IncludeSecrets) {
        $secretDir = Join-Path $Destination 'secrets'
        New-Item -ItemType Directory -Force -Path $secretDir | Out-Null
        Copy-Item -LiteralPath $oknoEnv -Destination (Join-Path $secretDir 'okno.env.vm')
        Copy-Item -LiteralPath $langEnv -Destination (Join-Path $secretDir 'mgc-languages.env.vm')
        Write-Warning 'VM secrets were included because MGC_VM_BACKUP_INCLUDE_SECRETS=YES. Protect this backup accordingly.'
    }

    $manifest = [ordered]@{
        created_utc = $Stamp
        profile = 'dual-vm-cpu-only-no-ai'
        okno_commit = Get-GitHead $Root
        mgc_languages_commit = Get-GitHead $LanguagesRoot
        okno_port = 3000
        mgc_languages_port = 8080
        includes_vm_secrets = $IncludeSecrets
        retention_days = $RetentionDays
    }
    $manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $Destination 'manifest.json') -Encoding UTF8

    $checksumPath = Join-Path $Destination 'checksums.sha256'
    $lines = New-Object System.Collections.Generic.List[string]
    Get-ChildItem -LiteralPath $Destination -Recurse -File | Where-Object { $_.Name -ne 'checksums.sha256' } | Sort-Object FullName | ForEach-Object {
        $hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        $relative = $_.FullName.Substring($Destination.Length).TrimStart([char[]]'\/')
        $lines.Add("$hash  $relative")
    }
    [System.IO.File]::WriteAllLines($checksumPath, $lines, [System.Text.UTF8Encoding]::new($false))

    foreach ($line in $lines) {
        $parts = $line -split '  ', 2
        $actual = (Get-FileHash -LiteralPath (Join-Path $Destination $parts[1]) -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actual -ne $parts[0]) { throw "SHA-256 verification failed for $($parts[1])." }
    }
    Write-Host '[GO] SHA-256 manifest verified.' -ForegroundColor Green

    $cutoff = (Get-Date).ToUniversalTime().AddDays(-$RetentionDays)
    Get-ChildItem -LiteralPath $BackupRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^\d{8}T\d{6}Z$' -and $_.LastWriteTimeUtc -lt $cutoff } |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host ''
    Write-Host "[GO] Dual VM backup completed: $Destination" -ForegroundColor Green
    Write-Host 'Files: okno.sqlite, mgc_languages.dump, manifest.json, checksums.sha256'
    if (Test-Path -LiteralPath (Join-Path $Destination 'okno-audit')) { Write-Host 'Also included: Okno audit directory' }
    if (Test-Path -LiteralPath (Join-Path $Destination 'runtime-config.json')) { Write-Host 'Also included: Okno runtime configuration' }
} finally {
    if ($oknoCid -and $oknoTmp) { & docker exec $oknoCid rm -f $oknoTmp *> $null }
    if ($dbCid -and $dbTmp) { & docker exec $dbCid rm -f $dbTmp *> $null }
}
