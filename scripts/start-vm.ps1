$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $Root
$EnvFile = Join-Path $Root '.env.vm'
$Example = Join-Path $Root '.env.vm.example'

function New-HexSecret([int]$Bytes = 32) {
    $buffer = New-Object byte[] $Bytes
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($buffer) } finally { $rng.Dispose() }
    return (-join ($buffer | ForEach-Object { $_.ToString('x2') }))
}

function Set-SmallEnvValue([string]$Key, [string]$Value) {
    $lines = [System.Collections.Generic.List[string]]::new()
    $found = $false
    $reader = [System.IO.StreamReader]::new($EnvFile)
    try {
        while (($line = $reader.ReadLine()) -ne $null) {
            if ($line.StartsWith("$Key=")) {
                $lines.Add("$Key=$Value")
                $found = $true
            } else { $lines.Add($line) }
        }
    } finally { $reader.Dispose() }
    if (-not $found) { $lines.Add("$Key=$Value") }
    [System.IO.File]::WriteAllLines($EnvFile, $lines, [System.Text.UTF8Encoding]::new($false))
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is not installed or not in PATH.' }
& docker info *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker daemon is not running.' }
& docker compose version *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose v2 is required.' }

if (-not (Test-Path $EnvFile)) {
    Copy-Item $Example $EnvFile
    Set-SmallEnvValue 'ADMIN_API_TOKEN' (New-HexSecret)
    Set-SmallEnvValue 'SCHEDULER_TOKEN' (New-HexSecret)
    Set-SmallEnvValue 'USER_DATA_HMAC_KEY' (New-HexSecret)
    Set-SmallEnvValue 'AUDIT_HMAC_KEY' (New-HexSecret)
    Write-Host 'Created .env.vm with generated local secrets.' -ForegroundColor Green
}

$composeArgs = @('compose','--env-file','.env.vm','-f','compose.yaml','-f','compose.vm.yaml')
Write-Host 'Validating CPU-only / no-AI VM configuration...' -ForegroundColor Cyan
& docker @composeArgs config *> $null
if ($LASTEXITCODE -ne 0) { throw 'docker compose config failed.' }

Write-Host 'Building Okno v Kitai...' -ForegroundColor Cyan
& docker @composeArgs build
if ($LASTEXITCODE -ne 0) { throw 'Docker build failed.' }

Write-Host 'Starting Okno v Kitai...' -ForegroundColor Cyan
& docker @composeArgs up -d
if ($LASTEXITCODE -ne 0) { throw 'Docker startup failed.' }

$cid = (& docker @composeArgs ps -q china-auto-radar).Trim()
if (-not $cid) { throw 'Web container was not created.' }
$health = ''
for ($i=0; $i -lt 90; $i++) {
    $health = (& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $cid 2>$null).Trim()
    if ($health -eq 'healthy') { break }
    if ($health -in @('exited','dead')) { & docker @composeArgs logs --tail=120 china-auto-radar; throw 'Application stopped during startup.' }
    Start-Sleep -Seconds 2
}
if ($health -ne 'healthy') { & docker @composeArgs logs --tail=120 china-auto-radar; throw 'Application did not become healthy.' }

$port = '3000'
$reader = [System.IO.StreamReader]::new($EnvFile)
try {
    while (($line = $reader.ReadLine()) -ne $null) { if ($line.StartsWith('APP_PORT=')) { $port = $line.Substring(9) } }
} finally { $reader.Dispose() }

Write-Host ''
Write-Host '[GO] Okno v Kitai VM is ready (CPU-only, generative AI disabled).' -ForegroundColor Green
Write-Host "Open: http://127.0.0.1:$port" -ForegroundColor Green
