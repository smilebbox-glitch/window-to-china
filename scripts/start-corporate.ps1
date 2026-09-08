param(
    [switch]$PreflightOnly
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $Root

$EnvFile = Join-Path $Root '.env.corporate'
$EnvExample = Join-Path $Root '.env.corporate.example'
$ComposeFile = Join-Path $Root 'compose.corporate.yaml'

function Get-EnvValue([string]$Key) {
    if (-not (Test-Path $EnvFile)) { return '' }
    $line = Get-Content $EnvFile | Where-Object { $_ -match ('^' + [regex]::Escape($Key) + '=') } | Select-Object -Last 1
    if (-not $line) { return '' }
    return $line.Substring($Key.Length + 1).Trim()
}

function Set-EnvValue([string]$Key, [string]$Value) {
    $lines = if (Test-Path $EnvFile) { @(Get-Content $EnvFile) } else { @() }
    $found = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match ('^' + [regex]::Escape($Key) + '=')) {
            $lines[$i] = "$Key=$Value"
            $found = $true
        }
    }
    if (-not $found) { $lines += "$Key=$Value" }
    [System.IO.File]::WriteAllLines($EnvFile, $lines, [System.Text.UTF8Encoding]::new($false))
}

function New-RandomBytes([int]$Count) {
    $bytes = New-Object byte[] $Count
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return $bytes
}

function New-HexSecret([int]$Count = 32) {
    $bytes = New-RandomBytes $Count
    return (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
}

function New-Base64Secret([int]$Count = 32) {
    return [Convert]::ToBase64String((New-RandomBytes $Count))
}

function Ensure-HexSecret([string]$Key) {
    $value = Get-EnvValue $Key
    if ([string]::IsNullOrWhiteSpace($value) -or $value -eq 'GENERATE_ON_FIRST_START' -or $value -match '^CHANGE_ME') {
        Set-EnvValue $Key (New-HexSecret 32)
        Write-Host "Generated local secret: $Key" -ForegroundColor Green
    }
}

function Ensure-Base64Secret([string]$Key) {
    $value = Get-EnvValue $Key
    if ([string]::IsNullOrWhiteSpace($value) -or $value -eq 'GENERATE_ON_FIRST_START' -or $value -match '^CHANGE_ME') {
        Set-EnvValue $Key (New-Base64Secret 32)
        Write-Host "Generated local secret: $Key" -ForegroundColor Green
    }
}

function Is-MissingITValue([string]$Value) {
    return [string]::IsNullOrWhiteSpace($Value) -or $Value -eq 'CHANGE_ME_IT' -or $Value -match '^CHANGE_ME'
}

function Resolve-RepoPath([string]$Value) {
    if ([System.IO.Path]::IsPathRooted($Value)) { return $Value }
    return [System.IO.Path]::GetFullPath((Join-Path $Root $Value))
}

Write-Host ''
Write-Host 'Okno v Kitai - Corporate HTTPS + SSO v1.7.9' -ForegroundColor Cyan
Write-Host "Working directory: $Root"
Write-Host ''

if (-not (Test-Path $EnvExample)) {
    Write-Host '[NO-GO] .env.corporate.example is missing.' -ForegroundColor Red
    exit 20
}
if (-not (Test-Path $EnvFile)) {
    Copy-Item $EnvExample $EnvFile
    Write-Host 'Created .env.corporate from the safe template.' -ForegroundColor Green
}

Ensure-Base64Secret 'OAUTH2_PROXY_COOKIE_SECRET'
Ensure-HexSecret 'AUTH_PROXY_SECRET'
Ensure-HexSecret 'AUDIT_HMAC_KEY'
Ensure-HexSecret 'SCHEDULER_TOKEN'
Ensure-HexSecret 'USER_DATA_HMAC_KEY'
Ensure-HexSecret 'METRICS_TOKEN'

$missing = New-Object System.Collections.Generic.List[string]
foreach ($key in @('OIDC_ISSUER_URL', 'OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET')) {
    if (Is-MissingITValue (Get-EnvValue $key)) {
        $missing.Add($key)
    }
}

$hostName = Get-EnvValue 'CORPORATE_HOST'
if ([string]::IsNullOrWhiteSpace($hostName) -or $hostName -match '^CHANGE_ME') {
    $missing.Add('CORPORATE_HOST')
}

$certSetting = Get-EnvValue 'TLS_CERT_FILE'
$keySetting = Get-EnvValue 'TLS_KEY_FILE'
if ([string]::IsNullOrWhiteSpace($certSetting)) { $certSetting = './deploy/tls/tls.crt' }
if ([string]::IsNullOrWhiteSpace($keySetting)) { $keySetting = './deploy/tls/tls.key' }
$certPath = Resolve-RepoPath $certSetting
$keyPath = Resolve-RepoPath $keySetting

if (-not (Test-Path $certPath)) { $missing.Add("TLS certificate: $certSetting") }
if (-not (Test-Path $keyPath)) { $missing.Add("TLS private key: $keySetting") }

if ($missing.Count -gt 0) {
    Write-Host ''
    Write-Host '[NO-GO] Corporate IT configuration is not complete.' -ForegroundColor Yellow
    foreach ($item in $missing) {
        Write-Host "  - $item" -ForegroundColor Yellow
    }
    Write-Host ''
    Write-Host 'Local secrets were generated safely in .env.corporate.' -ForegroundColor Green
    Write-Host 'Ask IT for the OIDC values, internal DNS hostname, and a trusted TLS certificate.' -ForegroundColor Cyan
    Write-Host 'Until then, use START.bat for the existing LAN pilot.' -ForegroundColor Cyan
    exit 20
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host '[NO-GO] Docker was not found in PATH.' -ForegroundColor Red
    exit 21
}

& docker version *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host '[NO-GO] Docker Desktop/Engine is not running.' -ForegroundColor Red
    exit 22
}

Write-Host '[1/3] Validating corporate Compose configuration...' -ForegroundColor Cyan
& docker compose --project-name okno-corporate --env-file $EnvFile -f $ComposeFile config *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host '[NO-GO] docker compose config failed.' -ForegroundColor Red
    exit 23
}
Write-Host 'PASS: corporate Compose configuration is valid.' -ForegroundColor Green

if ($PreflightOnly) {
    Write-Host 'PASS: corporate preflight only. No containers were changed.' -ForegroundColor Green
    exit 0
}

Write-Host '[2/3] Starting HTTPS + OIDC/SSO stack...' -ForegroundColor Cyan
& docker compose --project-name okno-corporate --env-file $EnvFile -f $ComposeFile up -d --build --remove-orphans
if ($LASTEXITCODE -ne 0) {
    Write-Host '[NO-GO] Corporate Docker stack failed to start.' -ForegroundColor Red
    & docker compose --project-name okno-corporate --env-file $EnvFile -f $ComposeFile logs --tail=120
    exit 30
}

Write-Host '[3/3] Waiting for application readiness...' -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    & docker compose --project-name okno-corporate --env-file $EnvFile -f $ComposeFile exec -T china-auto-radar node -e "fetch('http://127.0.0.1:3000/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" *> $null
    if ($LASTEXITCODE -eq 0) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    Write-Host '[NO-GO] Application did not reach readiness.' -ForegroundColor Red
    & docker compose --project-name okno-corporate --env-file $EnvFile -f $ComposeFile ps
    & docker compose --project-name okno-corporate --env-file $EnvFile -f $ComposeFile logs --tail=120 china-auto-radar nginx oauth2-proxy
    exit 31
}

Write-Host ''
Write-Host '================ CORPORATE ACCESS ================' -ForegroundColor Cyan
Write-Host "URL:          https://$hostName" -ForegroundColor Green
Write-Host "OIDC callback:https://$hostName/oauth2/callback" -ForegroundColor Green
Write-Host 'Auth mode:    trusted reverse proxy + OIDC' -ForegroundColor Green
Write-Host 'PWA:          enabled when the TLS certificate is trusted by the device' -ForegroundColor Green
Write-Host '==================================================' -ForegroundColor Cyan

try {
    [void][System.Net.Dns]::GetHostAddresses($hostName)
    Start-Process "https://$hostName"
} catch {
    Write-Host "DNS for $hostName is not resolvable on this PC yet. Ask IT to publish the internal DNS record." -ForegroundColor Yellow
}

exit 0
