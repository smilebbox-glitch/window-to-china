$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LanguagesRoot = $env:MGC_LANGUAGES_PATH
if (-not $LanguagesRoot) { $LanguagesRoot = Join-Path (Split-Path $Root -Parent) 'mgc-languages' }
$DiagnosticsRoot = $env:MGC_VM_DIAGNOSTICS_ROOT
if (-not $DiagnosticsRoot) { $DiagnosticsRoot = Join-Path (Split-Path $Root -Parent) 'vm-diagnostics' }
$IncludeLogs = $env:MGC_VM_DIAGNOSTICS_INCLUDE_LOGS
if (-not $IncludeLogs) { $IncludeLogs = 'NO' }
$stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$out = Join-Path $DiagnosticsRoot $stamp
New-Item -ItemType Directory -Path $out -Force | Out-Null

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is not installed or not in PATH.' }
& docker info *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker daemon is not running.' }

function Save-CommandOutput([string]$Path, [scriptblock]$Command) {
    try { & $Command *>&1 | Out-File -LiteralPath $Path -Encoding utf8 } catch { $_ | Out-File -LiteralPath $Path -Encoding utf8 }
}

@(
    "created_utc=$stamp",
    'profile=dual-vm-cpu-only-no-ai',
    "hostname=$env:COMPUTERNAME",
    "okno_root=$Root",
    "languages_root=$LanguagesRoot",
    "logs_included=$IncludeLogs"
) | Set-Content -LiteralPath (Join-Path $out 'summary.txt') -Encoding utf8

Save-CommandOutput (Join-Path $out 'host.txt') {
    Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, OSArchitecture, LastBootUpTime
    Get-CimInstance Win32_ComputerSystem | Select-Object Name, NumberOfLogicalProcessors, TotalPhysicalMemory
    Get-PSDrive -PSProvider FileSystem | Select-Object Name, Used, Free
}
Save-CommandOutput (Join-Path $out 'docker-version.txt') { & docker version }
Save-CommandOutput (Join-Path $out 'docker-disk.txt') { & docker system df }
Save-CommandOutput (Join-Path $out 'docker-containers.txt') { & docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' }
Save-CommandOutput (Join-Path $out 'docker-stats.txt') { & docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}' }

if (Test-Path -LiteralPath (Join-Path $Root '.git')) {
    Save-CommandOutput (Join-Path $out 'okno-git.txt') {
        Push-Location $Root
        try { & git rev-parse HEAD; & git status --short } finally { Pop-Location }
    }
}
if (Test-Path -LiteralPath (Join-Path $LanguagesRoot '.git')) {
    Save-CommandOutput (Join-Path $out 'languages-git.txt') {
        Push-Location $LanguagesRoot
        try { & git rev-parse HEAD; & git status --short } finally { Pop-Location }
    }
}

if (Test-Path -LiteralPath (Join-Path $Root '.env.vm') -PathType Leaf) {
    Save-CommandOutput (Join-Path $out 'okno-compose-ps.txt') {
        Push-Location $Root
        try { & docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml ps } finally { Pop-Location }
    }
}
if (Test-Path -LiteralPath (Join-Path $LanguagesRoot '.env.vm') -PathType Leaf) {
    Save-CommandOutput (Join-Path $out 'languages-compose-ps.txt') {
        Push-Location $LanguagesRoot
        try { & docker compose --env-file .env.vm -f docker-compose.lan.yml -f docker-compose.vm.yml ps } finally { Pop-Location }
    }
}

function Save-Http([string]$Url, [string]$Name) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 8
        [System.IO.File]::WriteAllText((Join-Path $out $Name), [string]$response.Content, [System.Text.UTF8Encoding]::new($false))
    } catch {
        $_.Exception.Message | Set-Content -LiteralPath (Join-Path $out ($Name + '.err')) -Encoding utf8
    }
}
Save-Http 'http://127.0.0.1:3000/api/health' 'okno-health.json'
Save-Http 'http://127.0.0.1:3000/api/ready' 'okno-ready.json'
Save-Http 'http://127.0.0.1:8080/health/live' 'languages-live.json'
Save-Http 'http://127.0.0.1:8080/health/ready' 'languages-ready.json'

# Deliberately avoid docker inspect environment dumps and .env.vm copies: they contain secrets.
if ($IncludeLogs -eq 'YES') {
    Add-Content -LiteralPath (Join-Path $out 'summary.txt') -Value 'WARNING: application logs may contain operational or user-derived data; treat this bundle as internal.'
    if (Test-Path -LiteralPath (Join-Path $Root '.env.vm') -PathType Leaf) {
        Save-CommandOutput (Join-Path $out 'okno-logs.txt') {
            Push-Location $Root
            try { & docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml logs --no-color --tail=200 } finally { Pop-Location }
        }
    }
    if (Test-Path -LiteralPath (Join-Path $LanguagesRoot '.env.vm') -PathType Leaf) {
        Save-CommandOutput (Join-Path $out 'languages-logs.txt') {
            Push-Location $LanguagesRoot
            try { & docker compose --env-file .env.vm -f docker-compose.lan.yml -f docker-compose.vm.yml logs --no-color --tail=200 app db nginx } finally { Pop-Location }
        }
    }
}

$hashLines = foreach ($file in Get-ChildItem -LiteralPath $out -File | Where-Object { $_.Name -ne 'checksums.sha256' } | Sort-Object Name) {
    $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $($file.Name)"
}
$hashLines | Set-Content -LiteralPath (Join-Path $out 'checksums.sha256') -Encoding ascii

Write-Host "[GO] Diagnostics bundle created: $out" -ForegroundColor Green
Write-Host 'No .env.vm files or container environment variables were collected.' -ForegroundColor Green
if ($IncludeLogs -ne 'YES') {
    Write-Host 'Application logs were excluded. Set MGC_VM_DIAGNOSTICS_INCLUDE_LOGS=YES only when IT needs them.' -ForegroundColor Yellow
}
