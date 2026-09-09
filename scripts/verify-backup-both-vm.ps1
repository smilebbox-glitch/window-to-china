Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$BackupRoot = if ($env:MGC_VM_BACKUP_ROOT) { $env:MGC_VM_BACKUP_ROOT } else { Join-Path (Split-Path $Root -Parent) 'vm-backups' }
$VerifyRoot = if ($env:MGC_VM_BACKUP_VERIFY_ROOT) { $env:MGC_VM_BACKUP_VERIFY_ROOT } else { Join-Path (Split-Path $Root -Parent) 'vm-backup-verification' }
$PostgresImage = if ($env:MGC_VM_VERIFY_POSTGRES_IMAGE) { $env:MGC_VM_VERIFY_POSTGRES_IMAGE } else { 'postgres:16.4-alpine' }
$Stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$Dest = Join-Path $VerifyRoot $Stamp
$PgName = ('mgc-backup-verify-{0}-{1}' -f $Stamp.ToLowerInvariant(), $PID)
$PgPassword = ('verify-{0}-{1}' -f $Stamp, $PID)
$PgUser = 'verify'
$PgDb = 'verify'
$PgStarted = $false
$TranscriptStarted = $false

function Invoke-Checked {
    param([string]$FilePath, [string[]]$Arguments)
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Command failed ($LASTEXITCODE): $FilePath $($Arguments -join ' ')" }
}

try {
    docker info *> $null
    if ($LASTEXITCODE -ne 0) { throw '[NO-GO] Docker daemon is not running.' }

    $LatestBackup = Get-ChildItem -LiteralPath $BackupRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^20\d{6}T\d{6}Z$' } |
        Sort-Object Name |
        Select-Object -Last 1
    if (-not $LatestBackup) { throw "[NO-GO] No timestamped backup found under $BackupRoot." }

    foreach ($file in @('okno.sqlite','mgc_languages.dump','manifest.json','checksums.sha256')) {
        $path = Join-Path $LatestBackup.FullName $file
        if (-not (Test-Path -LiteralPath $path) -or (Get-Item -LiteralPath $path).Length -le 0) {
            throw "[NO-GO] Backup file is missing or empty: $path"
        }
    }

    New-Item -ItemType Directory -Path $Dest -Force | Out-Null
    $Log = Join-Path $Dest 'verification.txt'
    Start-Transcript -Path $Log -Force | Out-Null
    $TranscriptStarted = $true

    Write-Host '======================================================'
    Write-Host ' MGC VM BACKUP RESTOREABILITY VERIFICATION'
    Write-Host '======================================================'
    Write-Host "Generated UTC: $Stamp"
    Write-Host "Backup: $($LatestBackup.FullName)"
    Write-Host ''
    Write-Host '=== Bundle integrity ==='
    Push-Location $LatestBackup.FullName
    try { Invoke-Checked 'sha256sum' @('-c','checksums.sha256') } finally { Pop-Location }
    Write-Host '[GO] Backup SHA-256 bundle verification passed.'

    Write-Host ''
    Write-Host '=== SQLite restoreability ==='
    $OknoImage = $env:MGC_VM_VERIFY_OKNO_IMAGE
    if (-not $OknoImage) {
        $EnvFile = Join-Path $Root '.env.vm'
        if (Test-Path -LiteralPath $EnvFile) {
            Push-Location $Root
            try {
                $images = & docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml config --images 2>$null
                if ($LASTEXITCODE -eq 0) { $OknoImage = $images | Where-Object { $_ -like 'okno-v-kitai:*' } | Select-Object -First 1 }
            } finally { Pop-Location }
        }
        if (-not $OknoImage) { $OknoImage = 'okno-v-kitai:1.7.9-pilot' }
    }
    & docker image inspect $OknoImage *> $null
    if ($LASTEXITCODE -ne 0) { throw "[NO-GO] Required Okno image is unavailable locally: $OknoImage. Run START_BOTH_VM once or set MGC_VM_VERIFY_OKNO_IMAGE." }

    $SqliteFile = Join-Path $LatestBackup.FullName 'okno.sqlite'
    $NodeCheck = @'
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("/verify/okno.sqlite", { readOnly: true });
try {
  const row = db.prepare("PRAGMA integrity_check").get();
  if (!row || row.integrity_check !== "ok") process.exit(2);
  const tables = db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type = 'table'").get();
  if (!tables || Number(tables.n) < 1) process.exit(3);
  console.log(`SQLite integrity=ok tables=${tables.n}`);
} finally { db.close(); }
'@
    Invoke-Checked 'docker' @('run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--mount',("type=bind,src={0},dst=/verify/okno.sqlite,readonly" -f $SqliteFile),$OknoImage,'node','--input-type=module','-e',$NodeCheck)
    Write-Host '[GO] Okno SQLite backup opened read-only and passed integrity_check.'

    Write-Host ''
    Write-Host '=== PostgreSQL disposable restore drill ==='
    & docker image inspect $PostgresImage *> $null
    if ($LASTEXITCODE -ne 0) { Invoke-Checked 'docker' @('pull',$PostgresImage) }
    Invoke-Checked 'docker' @('run','-d','--name',$PgName,'--network','none','--security-opt','no-new-privileges:true','--cap-drop','ALL','--cap-add','CHOWN','--cap-add','DAC_OVERRIDE','--cap-add','FOWNER','--cap-add','SETGID','--cap-add','SETUID','--tmpfs','/var/lib/postgresql/data:rw,nosuid,nodev,size=512m','--tmpfs','/tmp:rw,nosuid,nodev,size=128m','-e',"POSTGRES_USER=$PgUser",'-e',"POSTGRES_PASSWORD=$PgPassword",'-e',"POSTGRES_DB=$PgDb",$PostgresImage)
    $PgStarted = $true

    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
        & docker exec $PgName pg_isready -U $PgUser -d $PgDb *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw '[NO-GO] Disposable PostgreSQL verification container did not become ready.' }

    Invoke-Checked 'docker' @('cp',(Join-Path $LatestBackup.FullName 'mgc_languages.dump'),"${PgName}:/tmp/mgc_languages.dump")

    # The application schema contains RLS/policy references to the production role name "app".
    # Create only a NOLOGIN compatibility role inside this disposable, network-isolated database.
    # No production password, membership or privilege is copied into the drill.
    $RoleSql = @'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='app') THEN
    CREATE ROLE app NOLOGIN;
  END IF;
END $$;
'@
    Invoke-Checked 'docker' @('exec',$PgName,'psql','-v','ON_ERROR_STOP=1','-U',$PgUser,'-d',$PgDb,'-c',$RoleSql)

    Invoke-Checked 'docker' @('exec',$PgName,'pg_restore','--no-owner','--no-privileges','-U',$PgUser,'-d',$PgDb,'/tmp/mgc_languages.dump')
    $TableCountText = (& docker exec $PgName psql -U $PgUser -d $PgDb -Atc "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname='public';").Trim()
    if ($LASTEXITCODE -ne 0 -or -not ($TableCountText -match '^\d+$') -or [int]$TableCountText -lt 1) { throw '[NO-GO] Restored PostgreSQL database contains no public tables.' }
    $AlembicHead = (& docker exec $PgName psql -U $PgUser -d $PgDb -Atc 'SELECT version_num FROM alembic_version LIMIT 1;' 2>$null).Trim()
    if ($LASTEXITCODE -ne 0) { $AlembicHead = 'unknown' }
    $RoleLogin = (& docker exec $PgName psql -U $PgUser -d $PgDb -Atc "SELECT rolcanlogin FROM pg_roles WHERE rolname='app';").Trim()
    if ($LASTEXITCODE -ne 0 -or $RoleLogin -ne 'f') { throw '[NO-GO] Disposable compatibility role app unexpectedly has LOGIN capability.' }
    Write-Host "Restored public tables: $TableCountText"
    Write-Host "Alembic head: $AlembicHead"
    Write-Host 'Compatibility role app: NOLOGIN'
    Write-Host '[GO] MGC Languages PostgreSQL dump restored successfully into an isolated disposable database.'

    docker rm -f $PgName *> $null
    $PgStarted = $false

    $Verification = [ordered]@{
        generated_at_utc       = $Stamp
        profile                = 'dual-vm-cpu-only-no-ai'
        result                 = 'GO'
        backup_stamp           = $LatestBackup.Name
        sqlite_integrity       = 'passed'
        postgres_restore       = 'passed'
        postgres_public_tables = [int]$TableCountText
        compatibility_role_app = 'NOLOGIN'
        alembic_head           = $AlembicHead
        postgres_image         = $PostgresImage
        okno_image             = $OknoImage
    }
    $Verification | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $Dest 'verification.json') -Encoding utf8
    Stop-Transcript | Out-Null
    $TranscriptStarted = $false
    Push-Location $Dest
    try {
        & sha256sum verification.json verification.txt | Set-Content -LiteralPath checksums.sha256 -Encoding ascii
        Invoke-Checked 'sha256sum' @('-c','checksums.sha256')
    } finally { Pop-Location }
    Write-Host ''
    Write-Host "Evidence: $(Join-Path $Dest 'verification.json')"
    Write-Host "SHA-256: $(Join-Path $Dest 'checksums.sha256')"
    Write-Host '[GO] BACKUP RESTOREABILITY: VERIFIED WITHOUT MODIFYING PILOT DATABASES.'
}
finally {
    if ($PgStarted) { docker rm -f $PgName *> $null }
    if ($TranscriptStarted) { try { Stop-Transcript | Out-Null } catch { } }
}
