$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$LangRoot = if ($env:MGC_LANGUAGES_PATH) { $env:MGC_LANGUAGES_PATH } else { Join-Path (Split-Path -Parent $Root) 'mgc-languages' }
$BackupRoot = if ($env:MGC_VM_BACKUP_ROOT) { $env:MGC_VM_BACKUP_ROOT } else { Join-Path (Split-Path -Parent $Root) 'vm-backups' }
$ReportRoot = if ($env:MGC_VM_REPORT_ROOT) { $env:MGC_VM_REPORT_ROOT } else { Join-Path (Split-Path -Parent $Root) 'vm-reports' }
$LogRoot = if ($env:MGC_VM_DAILY_LOG_ROOT) { $env:MGC_VM_DAILY_LOG_ROOT } else { Join-Path (Split-Path -Parent $Root) 'vm-daily-logs' }
$BackupAfterHours = if ($env:MGC_VM_DAILY_BACKUP_AFTER_HOURS) { [double]$env:MGC_VM_DAILY_BACKUP_AFTER_HOURS } else { 20.0 }
$LogRetentionDays = if ($env:MGC_VM_DAILY_LOG_RETENTION_DAYS) { [int]$env:MGC_VM_DAILY_LOG_RETENTION_DAYS } else { 30 }
$ReportRetentionDays = if ($env:MGC_VM_REPORT_RETENTION_DAYS) { [int]$env:MGC_VM_REPORT_RETENTION_DAYS } else { 30 }
if ($BackupAfterHours -lt 0) { throw 'MGC_VM_DAILY_BACKUP_AFTER_HOURS must be non-negative.' }
if ($LogRetentionDays -lt 0 -or $ReportRetentionDays -lt 0) { throw 'Daily log/report retention values must be non-negative whole days.' }

$Stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$LogFile = Join-Path $LogRoot "$Stamp.log"
$LatestLog = Join-Path $LogRoot 'latest.log'
$LockDir = Join-Path $LogRoot '.daily-health.lock'
New-Item -ItemType Directory -Path $LogRoot -Force | Out-Null

try {
    New-Item -ItemType Directory -Path $LockDir -ErrorAction Stop | Out-Null
} catch {
    Write-Host '[WARN] Daily VM health check is already running. Skipping duplicate invocation.'
    exit 0
}

$script:LogLines = New-Object System.Collections.Generic.List[string]
function Write-HealthLine {
    param([string]$Text = '')
    Write-Host $Text
    $script:LogLines.Add($Text)
}

function Invoke-ChildPowerShell {
    param([string]$ScriptPath)
    $output = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ScriptPath 2>&1
    $code = $LASTEXITCODE
    foreach ($line in $output) { Write-HealthLine ([string]$line) }
    return $code
}

function Test-ChecksumBundle([string]$Directory) {
    $checksumPath = Join-Path $Directory 'checksums.sha256'
    if (-not (Test-Path -LiteralPath $checksumPath -PathType Leaf)) { return $false }
    foreach ($line in Get-Content -LiteralPath $checksumPath) {
        if ($line -notmatch '^([0-9a-fA-F]{64})\s{2}(.+)$') { return $false }
        $expected = $Matches[1].ToLowerInvariant()
        $relative = $Matches[2]
        $target = Join-Path $Directory $relative
        if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { return $false }
        $actual = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actual -ne $expected) { return $false }
    }
    return $true
}

try {
    Write-HealthLine '======================================================'
    Write-HealthLine ' MGC DAILY VM HEALTH - two services / no AI'
    Write-HealthLine '======================================================'
    Write-HealthLine "Generated UTC: $Stamp"
    Write-HealthLine

    $backupDue = $false
    $latestBackup = Get-ChildItem -LiteralPath $BackupRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^20\d{6}T\d{6}Z$' } |
        Sort-Object Name -Descending |
        Select-Object -First 1

    if (-not $latestBackup -or
        -not (Test-Path -LiteralPath (Join-Path $latestBackup.FullName 'manifest.json') -PathType Leaf) -or
        -not (Test-Path -LiteralPath (Join-Path $latestBackup.FullName 'checksums.sha256') -PathType Leaf)) {
        $backupDue = $true
        Write-HealthLine '[WARN] No complete timestamped backup found. A verified backup will be created.'
    } elseif (-not (Test-ChecksumBundle $latestBackup.FullName)) {
        $backupDue = $true
        Write-HealthLine '[WARN] Latest backup failed SHA-256 verification. A fresh verified backup will be created.'
    } else {
        $manifest = Get-Item -LiteralPath (Join-Path $latestBackup.FullName 'manifest.json')
        $ageHours = ([DateTime]::UtcNow - $manifest.LastWriteTimeUtc).TotalHours
        Write-HealthLine ('Latest backup: {0} ({1:N2} h old, SHA-256 verified)' -f $latestBackup.Name, $ageHours)
        if ($ageHours -ge $BackupAfterHours) { $backupDue = $true }
    }

    $backupRc = 0
    if ($backupDue) {
        Write-HealthLine
        Write-HealthLine '=== Daily verified backup ==='
        $backupRc = Invoke-ChildPowerShell (Join-Path $PSScriptRoot 'backup-both-vm.ps1')
        if ($backupRc -ne 0) {
            Write-HealthLine "[NO-GO] Daily verified backup failed with code $backupRc."
        } else {
            Write-HealthLine '[GO] Daily verified backup completed.'
        }
    } else {
        Write-HealthLine "[GO] Existing verified backup is newer than $BackupAfterHours h; no duplicate backup needed."
    }

    Write-HealthLine
    Write-HealthLine '=== Daily operations report ==='
    $reportRc = Invoke-ChildPowerShell (Join-Path $PSScriptRoot 'ops-report-both-vm.ps1')

    Write-HealthLine
    Write-HealthLine "Log: $LogFile"
    Write-HealthLine "Log retention: $LogRetentionDays days"
    Write-HealthLine "Report retention: $ReportRetentionDays days"
    if ($backupRc -ne 0 -or $reportRc -ne 0) {
        Write-HealthLine '[NO-GO] DAILY VM HEALTH: ATTENTION REQUIRED.'
        $exitCode = 1
    } else {
        Write-HealthLine '[GO] DAILY VM HEALTH: COMPLETED. Review any [WARN] lines above.'
        $exitCode = 0
    }

    $script:LogLines | Set-Content -LiteralPath $LogFile -Encoding UTF8
    Copy-Item -LiteralPath $LogFile -Destination $LatestLog -Force

    # Bound operational evidence growth. Backups have their own retention policy.
    if ($LogRetentionDays -gt 0) {
        $logCutoff = [DateTime]::UtcNow.AddDays(-$LogRetentionDays)
        Get-ChildItem -LiteralPath $LogRoot -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '^20\d{6}T\d{6}Z\.log$' -and $_.LastWriteTimeUtc -lt $logCutoff } |
            Remove-Item -Force -ErrorAction SilentlyContinue
    }
    if ($ReportRetentionDays -gt 0 -and (Test-Path -LiteralPath $ReportRoot -PathType Container)) {
        $reportCutoff = [DateTime]::UtcNow.AddDays(-$ReportRetentionDays)
        Get-ChildItem -LiteralPath $ReportRoot -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '^20\d{6}T\d{6}Z$' -and $_.LastWriteTimeUtc -lt $reportCutoff } |
            Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    }

    exit $exitCode
} finally {
    Remove-Item -LiteralPath $LockDir -Recurse -Force -ErrorAction SilentlyContinue
}
