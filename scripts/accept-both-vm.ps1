$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LanguagesRoot = $env:MGC_LANGUAGES_PATH
if (-not $LanguagesRoot) { $LanguagesRoot = Join-Path (Split-Path $Root -Parent) 'mgc-languages' }
$FirewallScript = Join-Path $Root 'scripts\host-firewall-preflight.ps1'
$StatusScript = Join-Path $Root 'scripts\status-both-vm.ps1'

function Fail([string]$Message) {
    Write-Host "[NO-GO] $Message" -ForegroundColor Red
    exit 1
}

function Get-PowerShellHost {
    $windowsPowerShell = Get-Command powershell.exe -ErrorAction SilentlyContinue
    if ($windowsPowerShell) { return $windowsPowerShell.Source }
    $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
    if ($pwsh) { return $pwsh.Source }
    Fail 'PowerShell host is unavailable.'
}

function Get-ContainerEnvValue([string]$ContainerId, [string]$Key) {
    $lines = @(& docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' $ContainerId 2>$null)
    foreach ($line in $lines) {
        $text = [string]$line
        if ($text.StartsWith("$Key=")) { return $text.Substring($Key.Length + 1) }
    }
    return ''
}

if (-not (Test-Path -LiteralPath $FirewallScript -PathType Leaf)) { Fail 'Host firewall preflight is missing.' }
if (-not (Test-Path -LiteralPath $StatusScript -PathType Leaf)) { Fail 'Shared VM status gate is missing.' }
if (-not (Test-Path -LiteralPath (Join-Path $Root '.env.vm') -PathType Leaf)) { Fail 'Okno .env.vm is missing. Start the VM profile first.' }
if (-not (Test-Path -LiteralPath (Join-Path $LanguagesRoot '.env.vm') -PathType Leaf)) { Fail 'MGC Languages .env.vm is missing. Start the VM profile first.' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Fail 'Docker is not installed or not in PATH.' }
& docker info *> $null
if ($LASTEXITCODE -ne 0) { Fail 'Docker daemon is not running.' }
$psHost = Get-PowerShellHost

Write-Host '=== 1/3 Host firewall acceptance ===' -ForegroundColor Cyan
if ($env:GITHUB_ACTIONS -eq 'true' -and $env:GITHUB_RUN_ID) {
    $oldAllowed = $env:MGC_VM_ALLOWED_CIDR
    $oldContract = $env:MGC_VM_FIREWALL_CONTRACT_ONLY
    if (-not $env:MGC_VM_ALLOWED_CIDR) { $env:MGC_VM_ALLOWED_CIDR = '10.250.0.0/24' }
    $env:MGC_VM_FIREWALL_CONTRACT_ONLY = '1'
    try {
        & $psHost -NoProfile -ExecutionPolicy Bypass -File $FirewallScript -ContractOnly
        if ($LASTEXITCODE -ne 0) { Fail "Host firewall contract failed with exit code $LASTEXITCODE." }
    } finally {
        if ($null -eq $oldAllowed) { Remove-Item Env:MGC_VM_ALLOWED_CIDR -ErrorAction SilentlyContinue } else { $env:MGC_VM_ALLOWED_CIDR = $oldAllowed }
        if ($null -eq $oldContract) { Remove-Item Env:MGC_VM_FIREWALL_CONTRACT_ONLY -ErrorAction SilentlyContinue } else { $env:MGC_VM_FIREWALL_CONTRACT_ONLY = $oldContract }
    }
} else {
    & $psHost -NoProfile -ExecutionPolicy Bypass -File $FirewallScript
    if ($LASTEXITCODE -ne 0) { Fail "Host firewall preflight failed with exit code $LASTEXITCODE." }
}

Write-Host ''
Write-Host '=== 2/3 Runtime readiness + ingress isolation ===' -ForegroundColor Cyan
$oldLanguagesPath = $env:MGC_LANGUAGES_PATH
$env:MGC_LANGUAGES_PATH = $LanguagesRoot
try {
    & $psHost -NoProfile -ExecutionPolicy Bypass -File $StatusScript
    if ($LASTEXITCODE -ne 0) { Fail "Shared VM status gate failed with exit code $LASTEXITCODE." }
} finally {
    if ($null -eq $oldLanguagesPath) { Remove-Item Env:MGC_LANGUAGES_PATH -ErrorAction SilentlyContinue } else { $env:MGC_LANGUAGES_PATH = $oldLanguagesPath }
}

Write-Host ''
Write-Host '=== 3/3 CPU-only / no-AI runtime contract ===' -ForegroundColor Cyan
Push-Location $Root
try {
    $oknoArgs = @('compose','--env-file','.env.vm','-f','compose.yaml','-f','compose.vm.yaml')
    $oknoCid = ([string](& docker @oknoArgs ps -q china-auto-radar 2>$null)).Trim()
} finally { Pop-Location }
Push-Location $LanguagesRoot
try {
    $langArgs = @('compose','--env-file','.env.vm','-f','docker-compose.lan.yml','-f','docker-compose.vm.yml')
    $langCid = ([string](& docker @langArgs ps -q app 2>$null)).Trim()
} finally { Pop-Location }

if ([string]::IsNullOrWhiteSpace($oknoCid)) { Fail 'Okno application container is not running.' }
if ([string]::IsNullOrWhiteSpace($langCid)) { Fail 'MGC Languages application container is not running.' }

$ragUrl = Get-ContainerEnvValue $oknoCid 'RAG_API_URL'
$ragModel = Get-ContainerEnvValue $oknoCid 'RAG_MODEL'
$ragKey = Get-ContainerEnvValue $oknoCid 'RAG_API_KEY'
$ttsEnabled = Get-ContainerEnvValue $langCid 'TTS_ENABLED'
$ttsCache = Get-ContainerEnvValue $langCid 'TTS_DISK_CACHE_ENABLED'

if (-not [string]::IsNullOrEmpty($ragUrl)) { Fail 'Okno RAG_API_URL must be empty in the temporary CPU-only pilot.' }
if (-not [string]::IsNullOrEmpty($ragModel)) { Fail 'Okno RAG_MODEL must be empty in the temporary CPU-only pilot.' }
if (-not [string]::IsNullOrEmpty($ragKey)) { Fail 'Okno RAG_API_KEY must be empty in the temporary CPU-only pilot.' }
if ($ttsEnabled -ne 'false') { Fail 'MGC Languages TTS_ENABLED must be false in the temporary CPU-only pilot.' }
if ($ttsCache -ne 'false') { Fail 'MGC Languages TTS_DISK_CACHE_ENABLED must be false in the temporary CPU-only pilot.' }

Write-Host '[GO] No-AI runtime contract is active for both services.' -ForegroundColor Green
Write-Host ''
Write-Host '[GO] VM PILOT ACCEPTANCE PASSED.' -ForegroundColor Green
Write-Host '     Host firewall: restricted corporate CIDR only'
Write-Host '     Okno v Kitai: readiness + hardened ingress + generative RAG disabled'
Write-Host '     MGC Languages: readiness + hardened nginx ingress + server TTS disabled'
Write-Host '     Ports: TCP 3000 and 8080 only through the configured host boundary'
exit 0
