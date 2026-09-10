param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $Root
$EnvPath = Join-Path $Root '.env'
. (Join-Path $PSScriptRoot 'env-file-utils.ps1')

function Stage([string]$Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Fail([string]$Text) { throw $Text }
function Get-EnvValue([string]$Key) {
    return (Get-EnvFileValue -Path $EnvPath -Key $Key)
}
function Set-EnvValue([string]$Key, [string]$Value) {
    Set-EnvFileValue -Path $EnvPath -Key $Key -Value $Value
}
function New-Secret([int]$Bytes = 48) {
    $buffer = New-Object byte[] $Bytes
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($buffer) } finally { $rng.Dispose() }
    return (-join ($buffer | ForEach-Object { $_.ToString('x2') }))
}
function Ensure-Secret([string]$Key, [string]$Placeholder = '') {
    $v = Get-EnvValue $Key
    if ([string]::IsNullOrWhiteSpace($v) -or ($Placeholder -and $v -eq $Placeholder)) {
        Set-EnvValue $Key (New-Secret)
    }
}
function Docker-Ready { try { & docker info *> $null; return ($LASTEXITCODE -eq 0) } catch { return $false } }
function Get-LanIPv4 {
    try {
        $defaultRoute = Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop |
            Where-Object { $_.NextHop -ne '0.0.0.0' } |
            Sort-Object RouteMetric, InterfaceMetric |
            Select-Object -First 1
        if ($defaultRoute) {
            $ip = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $defaultRoute.InterfaceIndex -ErrorAction Stop |
                Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254\.' } |
                Select-Object -ExpandProperty IPAddress -First 1
            if ($ip) { return $ip }
        }
    } catch {}
    return ''
}

Stage 'Checking Docker'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    $desktop = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    if (Test-Path $desktop) {
        Start-Process $desktop | Out-Null
        $dockerBin = 'C:\Program Files\Docker\Docker\resources\bin'
        if (Test-Path $dockerBin) { $env:Path = "$dockerBin;$env:Path" }
    } else {
        Fail 'Docker is not installed or is not in PATH. Install Docker Desktop once, then double-click START.bat again.'
    }
}
& docker compose version *> $null
if ($LASTEXITCODE -ne 0) { Fail 'Docker Compose v2 is required.' }
if (-not (Docker-Ready)) {
    $desktop = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    if (Test-Path $desktop) {
        Write-Host 'Starting Docker Desktop...'
        Start-Process $desktop -ErrorAction SilentlyContinue | Out-Null
        for ($i=0; $i -lt 60 -and -not (Docker-Ready); $i++) { Start-Sleep -Seconds 2 }
    }
}
if (-not (Docker-Ready)) { Fail 'Docker daemon is not running. Start Docker Desktop and run START.bat again.' }

Stage 'Preparing secure pilot configuration'
if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
    Write-Host 'Created .env from .env.example'
}
Ensure-Secret 'SCHEDULER_TOKEN' 'change-me-before-pilot'
Ensure-Secret 'USER_DATA_HMAC_KEY' 'change-me-user-data-hmac-before-pilot'
Ensure-Secret 'AUDIT_HMAC_KEY'
$targetVersion = (Get-Content 'package.json' -Raw | ConvertFrom-Json).version
if ([string]::IsNullOrWhiteSpace($targetVersion)) { Fail 'package.json does not contain a valid version.' }
$currentVersion = Get-EnvValue 'APP_VERSION'
if ($currentVersion -ne $targetVersion) {
    Set-EnvValue 'APP_VERSION' $targetVersion
    Write-Host "Updated APP_VERSION to $targetVersion"
}
$authMode = Get-EnvValue 'AUTH_MODE'
if ([string]::IsNullOrWhiteSpace($authMode)) { $authMode = 'disabled' }
if ($authMode -eq 'disabled') {
    Ensure-Secret 'ADMIN_API_TOKEN'
} elseif ($authMode -eq 'proxy') {
    if ([string]::IsNullOrWhiteSpace((Get-EnvValue 'AUTH_PROXY_SECRET'))) {
        Fail 'AUTH_MODE=proxy is configured but AUTH_PROXY_SECRET is empty. Configure the reverse proxy secret, then rerun START.bat.'
    }
} else {
    Fail "Unsupported AUTH_MODE='$authMode'. Expected disabled or proxy."
}
$policies = @{
    SOURCE_HISTORY_RETENTION_DAYS = 1
    SOURCE_HISTORY_MAX_ROWS = 100
    SCHEDULER_LOCK_TTL_SECONDS = 30
    SOURCE_SLA_FX_SECONDS = 60
    SOURCE_SLA_NEWS_SECONDS = 60
    USAGE_RETENTION_DAYS = 1
}
foreach ($key in $policies.Keys) {
    $raw = Get-EnvValue $key
    $n = 0
    if (-not [int]::TryParse($raw, [ref]$n) -or $n -lt $policies[$key]) {
        Fail "$key must be an integer >= $($policies[$key])."
    }
}

# LAN migration: old one-computer defaults are upgraded automatically.
$bindAddress = Get-EnvValue 'APP_BIND_ADDRESS'; if (-not $bindAddress) { $bindAddress = '0.0.0.0' }
$allowPublic = Get-EnvValue 'ALLOW_PUBLIC_BIND'; if (-not $allowPublic) { $allowPublic = 'YES' }
if ($bindAddress -eq '127.0.0.1' -and $allowPublic -eq 'NO') {
    Set-EnvValue 'APP_BIND_ADDRESS' '0.0.0.0'
    Set-EnvValue 'ALLOW_PUBLIC_BIND' 'YES'
    $bindAddress = '0.0.0.0'
    $allowPublic = 'YES'
    Write-Host 'Enabled trusted-LAN access (migrated from localhost-only defaults).'
}
if ($bindAddress -eq '0.0.0.0' -and $allowPublic -ne 'YES') {
    Fail 'APP_BIND_ADDRESS=0.0.0.0 requires ALLOW_PUBLIC_BIND=YES and trusted network/firewall controls.'
}

$hasGitCheckout = Test-Path (Join-Path $Root '.git')
$sourceRevision = 'package'
if ($hasGitCheckout -and (Get-Command git -ErrorAction SilentlyContinue)) {
    try { $sourceRevision = (& git rev-parse --short=12 HEAD 2>$null).Trim() } catch {}
    if ([string]::IsNullOrWhiteSpace($sourceRevision)) { $sourceRevision = 'package' }
}

Stage 'Validating Docker Compose'
& docker compose config *> $null
if ($LASTEXITCODE -ne 0) { Fail 'docker compose config validation failed.' }

$offlineImage = Join-Path $Root 'okno-v-kitai-image.tar'
$forceOffline = (Get-EnvValue 'USE_OFFLINE_IMAGE') -eq 'YES'
$useOfflineImage = (Test-Path $offlineImage) -and ((-not $hasGitCheckout) -or $forceOffline)

if ($useOfflineImage) {
    Stage 'Loading offline Docker image'
    & docker load -i $offlineImage
    if ($LASTEXITCODE -ne 0) { Fail 'docker load failed.' }
    $appVersion = Get-EnvValue 'APP_VERSION'; if (-not $appVersion) { $appVersion = $targetVersion }
    $expectedImage = "okno-v-kitai:$appVersion"
    & docker image inspect $expectedImage *> $null
    if ($LASTEXITCODE -ne 0) { Fail "Offline image does not provide expected tag $expectedImage." }
    Stage 'Starting services from the intentional offline image'
    & docker compose up -d --no-build --force-recreate
} else {
    if (Test-Path $offlineImage) {
        Write-Host 'Ignoring okno-v-kitai-image.tar because this is a Git source checkout.' -ForegroundColor Yellow
        Write-Host 'Building the current source revision instead. Set USE_OFFLINE_IMAGE=YES only for an intentional offline deployment.' -ForegroundColor Yellow
    }
    Stage "Building current application source ($sourceRevision)"
    & docker compose build
    if ($LASTEXITCODE -ne 0) { Fail 'Docker build failed. Check registry/network access and the build log above.' }
    Stage 'Starting current web + scheduler'
    & docker compose up -d --force-recreate
}
if ($LASTEXITCODE -ne 0) { Fail 'docker compose up failed.' }

Stage 'Waiting for application readiness'
$cid = (& docker compose ps -q china-auto-radar).Trim()
if (-not $cid) { Fail 'Web container was not created.' }
$health = ''
for ($i=0; $i -lt 90; $i++) {
    $health = (& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $cid 2>$null).Trim()
    if ($health -eq 'healthy') { break }
    if ($health -in @('exited','dead')) { & docker compose logs --tail=120 china-auto-radar; Fail 'Web container stopped during startup.' }
    Start-Sleep -Seconds 2
}
if ($health -ne 'healthy') { & docker compose logs --tail=120 china-auto-radar; Fail 'Application did not become healthy.' }

Stage 'Running smoke checks'
$port = Get-EnvValue 'APP_PORT'; if (-not $port) { $port = '3000' }
$localBase = "http://127.0.0.1:$port"
foreach ($path in @('/api/health','/api/ready','/api/content?section=travel-guide')) {
    $r = Invoke-WebRequest -UseBasicParsing -Uri ($localBase + $path) -TimeoutSec 15
    if ($r.StatusCode -lt 200 -or $r.StatusCode -ge 300) { Fail "$path returned HTTP $($r.StatusCode)" }
}
$running = @(& docker compose ps --status running --services)
if ($running -notcontains 'china-auto-radar-scheduler') { Fail 'Scheduler is not running.' }
Write-Host 'PASS  health/readiness/content + scheduler'

$lanIp = Get-LanIPv4
$lanBase = if ($lanIp) { "http://${lanIp}:$port" } else { '' }
$adminToken = Get-EnvValue 'ADMIN_API_TOKEN'
$access = @(
    "Okno v Kitai Pilot $targetVersion",
    "Source revision: $sourceRevision",
    "Local URL: $localBase"
)
if ($lanBase) { $access += "LAN URL: $lanBase" }
if ($authMode -eq 'disabled') { $access += "Admin API token: $adminToken" } else { $access += 'Authentication: corporate proxy / SSO' }
$access += ('Generated: ' + [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ'))
[System.IO.File]::WriteAllLines((Join-Path $Root '.pilot-access.txt'), $access, [System.Text.UTF8Encoding]::new($false))

Stage 'READY'
Write-Host "Source revision: $sourceRevision" -ForegroundColor Green
Write-Host "This PC: $localBase" -ForegroundColor Green
if ($lanBase) {
    Write-Host "Other PCs on the same LAN: $lanBase" -ForegroundColor Green
    Write-Host 'If another PC cannot connect, allow inbound TCP for APP_PORT in Windows Firewall on the Domain/Private profile.'
} else {
    Write-Host 'LAN address could not be detected automatically. Run ipconfig and use http://<IPv4-address>:APP_PORT.'
}
Write-Host "Access details: $(Join-Path $Root '.pilot-access.txt')"
Write-Host 'Stop: STOP.bat    Status: STATUS.bat'
if (-not $NoBrowser) { Start-Process $localBase -ErrorAction SilentlyContinue | Out-Null }
