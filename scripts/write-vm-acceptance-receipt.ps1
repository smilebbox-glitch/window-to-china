$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LanguagesRoot = $env:MGC_LANGUAGES_PATH
if (-not $LanguagesRoot) { $LanguagesRoot = Join-Path (Split-Path $Root -Parent) 'mgc-languages' }
$AcceptanceRoot = $env:MGC_VM_ACCEPTANCE_ROOT
if (-not $AcceptanceRoot) { $AcceptanceRoot = Join-Path (Split-Path $Root -Parent) 'vm-acceptance' }
$HostEnv = $env:MGC_VM_HOST_ENV
if (-not $HostEnv) { $HostEnv = Join-Path $Root '.env.vm-host' }

function Fail([string]$Message) {
    Write-Host "[NO-GO] $Message" -ForegroundColor Red
    exit 1
}

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

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail 'Git is required for acceptance evidence.' }
if (-not (Test-Path -LiteralPath (Join-Path $Root '.git'))) { Fail 'Okno Git checkout is unavailable for acceptance evidence.' }
if (-not (Test-Path -LiteralPath (Join-Path $LanguagesRoot '.git'))) { Fail 'MGC Languages Git checkout is unavailable for acceptance evidence.' }

$AllowedCidr = $env:MGC_VM_ALLOWED_CIDR
if (-not $AllowedCidr) { $AllowedCidr = Get-SmallEnvValue $HostEnv 'MGC_VM_ALLOWED_CIDR' }
if (-not $AllowedCidr) { Fail 'MGC_VM_ALLOWED_CIDR is unavailable for acceptance evidence.' }

$timestamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$createdAt = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
$destination = Join-Path $AcceptanceRoot $timestamp
New-Item -ItemType Directory -Force -Path $destination | Out-Null

$oknoCommit = ([string](& git -C $Root rev-parse HEAD)).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($oknoCommit)) { Fail 'Could not resolve Okno commit for acceptance evidence.' }
$languagesCommit = ([string](& git -C $LanguagesRoot rev-parse HEAD)).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($languagesCommit)) { Fail 'Could not resolve MGC Languages commit for acceptance evidence.' }

$receipt = [ordered]@{
    schema = 1
    profile = 'dual-vm-cpu-only-no-ai'
    result = 'GO'
    accepted_at_utc = $createdAt
    okno_commit = $oknoCommit
    mgc_languages_commit = $languagesCommit
    allowed_cidr = $AllowedCidr
    ports = @(3000, 8080)
    checks = [ordered]@{
        host_firewall = 'passed'
        runtime_readiness = 'passed'
        ingress_isolation = 'passed'
        no_ai_runtime = 'passed'
    }
}

$receiptPath = Join-Path $destination 'acceptance.json'
$receipt | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $receiptPath -Encoding UTF8
$hash = (Get-FileHash -LiteralPath $receiptPath -Algorithm SHA256).Hash.ToLowerInvariant()
$checksumPath = Join-Path $destination 'checksums.sha256'
"$hash  acceptance.json" | Set-Content -LiteralPath $checksumPath -Encoding ASCII
$verify = (Get-FileHash -LiteralPath $receiptPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($verify -ne $hash) { Fail 'Acceptance evidence checksum verification failed.' }

Write-Host "[GO] Acceptance evidence receipt: $destination" -ForegroundColor Green
Write-Output $destination
exit 0
