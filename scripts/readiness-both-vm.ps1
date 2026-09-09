$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LanguagesRoot = $env:MGC_LANGUAGES_PATH
if (-not $LanguagesRoot) { $LanguagesRoot = Join-Path (Split-Path $Root -Parent) 'mgc-languages' }
$AcceptanceRoot = $env:MGC_VM_ACCEPTANCE_ROOT
if (-not $AcceptanceRoot) { $AcceptanceRoot = Join-Path (Split-Path $Root -Parent) 'vm-acceptance' }
$BackupRoot = $env:MGC_VM_BACKUP_ROOT
if (-not $BackupRoot) { $BackupRoot = Join-Path (Split-Path $Root -Parent) 'vm-backups' }
$HostEnv = $env:MGC_VM_HOST_ENV
if (-not $HostEnv) { $HostEnv = Join-Path $Root '.env.vm-host' }
$StatusScript = Join-Path $Root 'scripts\status-both-vm.ps1'
$rc = 0

function NoGo([string]$Message) { Write-Host "[NO-GO] $Message" -ForegroundColor Red; $script:rc = 1 }
function Warn([string]$Message) { Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Go([string]$Message) { Write-Host "[GO] $Message" -ForegroundColor Green }

function Get-SmallEnvValue([string]$Path, [string]$Key) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return '' }
    $reader = [System.IO.StreamReader]::new($Path)
    $value = ''
    try {
        while (($line = $reader.ReadLine()) -ne $null) {
            if ($line.StartsWith("$Key=")) { $value = $line.Substring($Key.Length + 1).Trim() }
        }
    } finally { $reader.Dispose() }
    return $value
}

function Get-LatestTimestampDirectory([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) { return $null }
    return Get-ChildItem -LiteralPath $Path -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^20\d{6}T\d{6}Z$' } |
        Sort-Object Name |
        Select-Object -Last 1
}

function Test-Sha256Receipt([string]$Directory, [string]$FileName) {
    $sumPath = Join-Path $Directory 'checksums.sha256'
    $filePath = Join-Path $Directory $FileName
    if (-not (Test-Path -LiteralPath $sumPath -PathType Leaf) -or -not (Test-Path -LiteralPath $filePath -PathType Leaf)) { return $false }
    $line = Get-Content -LiteralPath $sumPath | Where-Object { $_ -match ([regex]::Escape($FileName) + '$') } | Select-Object -First 1
    if (-not $line) { return $false }
    $expected = (($line -split '\s+', 2)[0]).ToLowerInvariant()
    if ($expected -notmatch '^[0-9a-f]{64}$') { return $false }
    $actual = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash.ToLowerInvariant()
    return $actual -eq $expected
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Write-Host '[NO-GO] Git is required.' -ForegroundColor Red; exit 1 }
if (-not (Test-Path -LiteralPath (Join-Path $Root '.git'))) { Write-Host '[NO-GO] Okno Git checkout is unavailable.' -ForegroundColor Red; exit 1 }
if (-not (Test-Path -LiteralPath (Join-Path $LanguagesRoot '.git'))) { Write-Host '[NO-GO] MGC Languages Git checkout is unavailable.' -ForegroundColor Red; exit 1 }
if (-not (Test-Path -LiteralPath $StatusScript -PathType Leaf)) { Write-Host '[NO-GO] Shared status script is missing.' -ForegroundColor Red; exit 1 }

Write-Host '======================================================' -ForegroundColor Cyan
Write-Host ' MGC VM PILOT READINESS - two services / no AI' -ForegroundColor Cyan
Write-Host '======================================================' -ForegroundColor Cyan
Write-Host ''

Write-Host '=== Runtime ===' -ForegroundColor Cyan
$oldLanguagesPath = $env:MGC_LANGUAGES_PATH
$env:MGC_LANGUAGES_PATH = $LanguagesRoot
try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $StatusScript
    if ($LASTEXITCODE -eq 0) { Go 'Both services passed current readiness + container ingress isolation.' }
    else { NoGo 'Current service readiness or ingress isolation failed.' }
} finally {
    if ($null -eq $oldLanguagesPath) { Remove-Item Env:MGC_LANGUAGES_PATH -ErrorAction SilentlyContinue } else { $env:MGC_LANGUAGES_PATH = $oldLanguagesPath }
}

Write-Host ''
Write-Host '=== Deployment identity ===' -ForegroundColor Cyan
$currentOkno = ([string](& git -C $Root rev-parse HEAD)).Trim()
$currentLanguages = ([string](& git -C $LanguagesRoot rev-parse HEAD)).Trim()
Write-Host "Okno current:          $currentOkno"
Write-Host "MGC Languages current: $currentLanguages"

Write-Host ''
Write-Host '=== Latest acceptance ===' -ForegroundColor Cyan
$latestAcceptance = Get-LatestTimestampDirectory $AcceptanceRoot
if (-not $latestAcceptance) {
    NoGo "No acceptance receipt found under $AcceptanceRoot. Run ACCEPT_BOTH_VM before admitting pilot users."
} else {
    $receiptPath = Join-Path $latestAcceptance.FullName 'acceptance.json'
    if (-not (Test-Sha256Receipt $latestAcceptance.FullName 'acceptance.json')) {
        NoGo "Latest acceptance receipt failed SHA-256 verification: $($latestAcceptance.FullName)"
    } else {
        try { $receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json }
        catch { $receipt = $null; NoGo "Latest acceptance JSON is invalid: $receiptPath" }
        if ($receipt) {
            $currentCidr = $env:MGC_VM_ALLOWED_CIDR
            if (-not $currentCidr) { $currentCidr = Get-SmallEnvValue $HostEnv 'MGC_VM_ALLOWED_CIDR' }
            Write-Host "Receipt:               $($latestAcceptance.FullName)"
            Write-Host "Accepted at UTC:       $($receipt.accepted_at_utc)"
            Write-Host "Accepted Okno:         $($receipt.okno_commit)"
            Write-Host "Accepted MGC:          $($receipt.mgc_languages_commit)"
            Write-Host "Accepted CIDR:         $($receipt.allowed_cidr)"

            if ($receipt.result -ne 'GO') { NoGo 'Latest acceptance receipt does not contain result=GO.' }
            elseif (-not $receipt.okno_commit -or -not $receipt.mgc_languages_commit -or -not $receipt.allowed_cidr) { NoGo 'Latest acceptance receipt is missing deployment identity fields.' }
            elseif ($receipt.okno_commit -ne $currentOkno -or $receipt.mgc_languages_commit -ne $currentLanguages) { NoGo 'ACCEPTANCE STALE: repository revisions changed after the last GO. Run ACCEPT_BOTH_VM again.' }
            elseif (-not $currentCidr -or $receipt.allowed_cidr -ne $currentCidr) { NoGo 'ACCEPTANCE STALE: corporate CIDR differs from the accepted boundary. Run ACCEPT_BOTH_VM again.' }
            else { Go 'Acceptance is CURRENT: commits and corporate CIDR match the latest GO receipt.' }
        }
    }
}

Write-Host ''
Write-Host '=== Latest backup ===' -ForegroundColor Cyan
$latestBackup = Get-LatestTimestampDirectory $BackupRoot
if (-not $latestBackup) {
    Warn "No normal timestamped backup found under $BackupRoot. Create BACKUP_BOTH_VM before sustained pilot use."
} else {
    $manifestPath = Join-Path $latestBackup.FullName 'manifest.json'
    if (-not (Test-Sha256Receipt $latestBackup.FullName 'manifest.json')) {
        Warn "Latest backup manifest checksum verification failed or metadata is incomplete: $($latestBackup.FullName)"
    } else {
        try { $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json }
        catch { $manifest = $null; Warn "Latest backup manifest JSON is invalid: $manifestPath" }
        if ($manifest) {
            Write-Host "Backup:                $($latestBackup.FullName)"
            Write-Host "Backup created UTC:    $($manifest.created_utc)"
            Write-Host "Backup Okno commit:    $($manifest.okno_commit)"
            Write-Host "Backup MGC commit:     $($manifest.mgc_languages_commit)"
            Go 'Latest backup manifest checksum is valid.'
            if ($manifest.okno_commit -ne $currentOkno -or $manifest.mgc_languages_commit -ne $currentLanguages) {
                Warn 'Latest backup was created on different revisions than the current checkout. This is allowed, but create a fresh backup before risky maintenance.'
            }
        }
    }
}

Write-Host ''
if ($rc -eq 0) {
    Write-Host '[GO] PILOT READINESS: CURRENT ACCEPTANCE / SERVICES READY.' -ForegroundColor Green
    exit 0
}
Write-Host '[NO-GO] PILOT READINESS: ATTENTION REQUIRED.' -ForegroundColor Red
exit $rc
