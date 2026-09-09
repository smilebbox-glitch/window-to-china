$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LanguagesRoot = $env:MGC_LANGUAGES_PATH
if (-not $LanguagesRoot) { $LanguagesRoot = Join-Path (Split-Path $Root -Parent) 'mgc-languages' }
$ReportRoot = $env:MGC_VM_REPORT_ROOT
if (-not $ReportRoot) { $ReportRoot = Join-Path (Split-Path $Root -Parent) 'vm-reports' }
$BackupRoot = $env:MGC_VM_BACKUP_ROOT
if (-not $BackupRoot) { $BackupRoot = Join-Path (Split-Path $Root -Parent) 'vm-backups' }

[double]$DiskWarnGb = 10
[double]$DiskNoGoGb = 5
[double]$BackupMaxAgeHours = 24
if ($env:MGC_VM_DISK_WARN_GB) { [double]$DiskWarnGb = $env:MGC_VM_DISK_WARN_GB }
if ($env:MGC_VM_DISK_NO_GO_GB) { [double]$DiskNoGoGb = $env:MGC_VM_DISK_NO_GO_GB }
if ($env:MGC_VM_BACKUP_MAX_AGE_HOURS) { [double]$BackupMaxAgeHours = $env:MGC_VM_BACKUP_MAX_AGE_HOURS }
if ($DiskNoGoGb -lt 0 -or $DiskWarnGb -lt 0 -or $BackupMaxAgeHours -lt 0) { throw 'Operational thresholds must be non-negative.' }
if ($DiskNoGoGb -ge $DiskWarnGb) { throw 'MGC_VM_DISK_NO_GO_GB must be lower than MGC_VM_DISK_WARN_GB.' }

$Stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$Destination = Join-Path $ReportRoot $Stamp
$ReadinessFile = Join-Path $Destination 'readiness.txt'
$script:NoGo = $false
$script:Warnings = $false

function Write-NoGo([string]$Message) { Write-Host "[NO-GO] $Message" -ForegroundColor Red; $script:NoGo = $true }
function Write-WarnLine([string]$Message) { Write-Host "[WARN] $Message" -ForegroundColor Yellow; $script:Warnings = $true }
function Write-Go([string]$Message) { Write-Host "[GO] $Message" -ForegroundColor Green }

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

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is required.' }
if (-not (Test-Path -LiteralPath (Join-Path $Root '.git') -PathType Container)) { throw 'Okno Git checkout is unavailable.' }
if (-not (Test-Path -LiteralPath (Join-Path $LanguagesRoot '.git') -PathType Container)) { throw 'MGC Languages Git checkout is unavailable.' }
New-Item -ItemType Directory -Force -Path $Destination | Out-Null

Write-Host '======================================================'
Write-Host ' MGC VM OPERATIONS REPORT - two services / no AI'
Write-Host '======================================================'
Write-Host "Generated UTC: $Stamp"
Write-Host ''

Write-Host '=== Runtime / acceptance ===' -ForegroundColor Cyan
$CheckMode = 'full-readiness'
$CheckScript = Join-Path $Root 'scripts\readiness-both-vm.ps1'
if ($env:MGC_VM_REPORT_CI_SKIP_ACCEPTANCE -eq 'YES') {
    if ($env:GITHUB_ACTIONS -ne 'true') {
        Write-NoGo 'MGC_VM_REPORT_CI_SKIP_ACCEPTANCE is allowed only inside GitHub Actions.'
    } else {
        $CheckMode = 'ci-runtime-only'
        $CheckScript = Join-Path $Root 'scripts\status-both-vm.ps1'
    }
}

$oldLanguagesPath = $env:MGC_LANGUAGES_PATH
$oldBackupRoot = $env:MGC_VM_BACKUP_ROOT
$env:MGC_LANGUAGES_PATH = $LanguagesRoot
$env:MGC_VM_BACKUP_ROOT = $BackupRoot
try {
    $hostExe = (Get-Process -Id $PID).Path
    $checkOutput = @(& $hostExe -NoProfile -File $CheckScript 2>&1)
    $ReadinessRc = $LASTEXITCODE
} finally {
    $env:MGC_LANGUAGES_PATH = $oldLanguagesPath
    $env:MGC_VM_BACKUP_ROOT = $oldBackupRoot
}
[System.IO.File]::WriteAllLines($ReadinessFile, [string[]]($checkOutput | ForEach-Object { [string]$_ }), [System.Text.UTF8Encoding]::new($false))
$checkOutput | ForEach-Object { Write-Host ([string]$_) }
if ($ReadinessRc -ne 0) { Write-NoGo "Runtime/acceptance gate returned code $ReadinessRc." } else { Write-Go "Runtime/acceptance gate passed ($CheckMode)." }

Write-Host ''
Write-Host '=== Host capacity ===' -ForegroundColor Cyan
$resolvedReportRoot = (Resolve-Path $ReportRoot).Path
$driveRoot = [System.IO.Path]::GetPathRoot($resolvedReportRoot)
if (-not $driveRoot) { throw 'Could not determine filesystem root for report storage.' }
$driveInfo = [System.IO.DriveInfo]::new($driveRoot)
$DiskFreeGb = [math]::Round($driveInfo.AvailableFreeSpace / 1GB, 2)
Write-Host ("Disk free:             {0:N2} GiB" -f $DiskFreeGb)
Write-Host ("Warning threshold:     {0:N2} GiB" -f $DiskWarnGb)
Write-Host ("NO-GO threshold:       {0:N2} GiB" -f $DiskNoGoGb)
if ($DiskFreeGb -lt $DiskNoGoGb) {
    Write-NoGo 'Free disk is below the NO-GO threshold. Backups and database writes may become unsafe.'
} elseif ($DiskFreeGb -lt $DiskWarnGb) {
    Write-WarnLine 'Free disk is below the warning threshold. Plan cleanup/capacity expansion.'
} else {
    Write-Go 'Disk capacity is above the warning threshold.'
}

Write-Host ''
Write-Host '=== Backup freshness ===' -ForegroundColor Cyan
$latestBackup = Get-ChildItem -LiteralPath $BackupRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^\d{8}T\d{6}Z$' } |
    Sort-Object Name |
    Select-Object -Last 1
$BackupStamp = ''
$BackupAgeHours = $null
$BackupChecksumValid = $false
if (-not $latestBackup) {
    Write-WarnLine "No timestamped backup found under $BackupRoot. Create BACKUP_BOTH_VM before sustained pilot use."
} else {
    $BackupStamp = $latestBackup.Name
    $manifest = Join-Path $latestBackup.FullName 'manifest.json'
    $sums = Join-Path $latestBackup.FullName 'checksums.sha256'
    if (-not (Test-Path -LiteralPath $manifest -PathType Leaf) -or -not (Test-Path -LiteralPath $sums -PathType Leaf)) {
        Write-NoGo "Latest backup metadata is incomplete: $($latestBackup.FullName)"
    } elseif (Test-ChecksumBundle $latestBackup.FullName) {
        $BackupChecksumValid = $true
        $BackupAgeHours = [math]::Round(((Get-Date).ToUniversalTime() - (Get-Item -LiteralPath $manifest).LastWriteTimeUtc).TotalHours, 2)
        Write-Host "Latest backup:         $BackupStamp"
        Write-Host ("Backup age:            {0:N2} h" -f $BackupAgeHours)
        Write-Host ("Max recommended age:   {0:N2} h" -f $BackupMaxAgeHours)
        Write-Go 'Latest backup SHA-256 bundle verification passed.'
        if ($BackupAgeHours -gt $BackupMaxAgeHours) {
            Write-WarnLine 'Latest verified backup is older than the recommended freshness window.'
        } else {
            Write-Go 'Backup freshness is within the recommended window.'
        }
    } else {
        Write-NoGo "Latest backup failed SHA-256 verification: $($latestBackup.FullName)"
    }
}

$OknoSha = ([string](& git -C $Root rev-parse HEAD)).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Could not read Okno Git revision.' }
$LangSha = ([string](& git -C $LanguagesRoot rev-parse HEAD)).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Could not read MGC Languages Git revision.' }
if ($script:NoGo) { $Result = 'NO-GO' } elseif ($script:Warnings) { $Result = 'WARN' } else { $Result = 'GO' }

$report = [ordered]@{
    generated_at_utc = $Stamp
    profile = 'dual-vm-cpu-only-no-ai'
    result = $Result
    check_mode = $CheckMode
    okno_commit = $OknoSha
    mgc_languages_commit = $LangSha
    readiness_exit_code = $ReadinessRc
    disk_free_gb = $DiskFreeGb
    disk_warn_gb = $DiskWarnGb
    disk_no_go_gb = $DiskNoGoGb
    backup_stamp = $BackupStamp
    backup_age_hours = $BackupAgeHours
    backup_max_age_hours = $BackupMaxAgeHours
    backup_checksum_valid = $BackupChecksumValid
}
$operationsPath = Join-Path $Destination 'operations.json'
$report | ConvertTo-Json | Set-Content -LiteralPath $operationsPath -Encoding UTF8

$checksumPath = Join-Path $Destination 'checksums.sha256'
$checksumLines = New-Object System.Collections.Generic.List[string]
foreach ($name in @('operations.json','readiness.txt')) {
    $target = Join-Path $Destination $name
    $hash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
    $checksumLines.Add("$hash  $name")
}
[System.IO.File]::WriteAllLines($checksumPath, $checksumLines, [System.Text.UTF8Encoding]::new($false))
if (-not (Test-ChecksumBundle $Destination)) { throw 'Operations report SHA-256 verification failed.' }

Write-Host ''
Write-Host "Report: $operationsPath"
Write-Host "SHA-256: $checksumPath"
if ($Result -eq 'NO-GO') {
    Write-Host '[NO-GO] OPERATIONS REPORT: ATTENTION REQUIRED.' -ForegroundColor Red
    exit 1
}
if ($Result -eq 'WARN') {
    Write-Host '[WARN] OPERATIONS REPORT: SERVICES CAN RUN, BUT MAINTENANCE ATTENTION IS RECOMMENDED.' -ForegroundColor Yellow
    exit 0
}
Write-Host '[GO] OPERATIONS REPORT: HEALTHY / CURRENT / CAPACITY OK / BACKUP FRESH.' -ForegroundColor Green
exit 0
