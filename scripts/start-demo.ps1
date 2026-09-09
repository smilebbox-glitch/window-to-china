$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $Root

$StartVm = Join-Path $Root 'scripts\start-vm.ps1'
$EnvFile = Join-Path $Root '.env.vm'

if (-not (Test-Path $StartVm)) {
    throw 'scripts\start-vm.ps1 is missing.'
}

Write-Host '==================================================' -ForegroundColor Cyan
Write-Host ' Okno v Kitai - FULL DEMO / CPU-only / no AI' -ForegroundColor Cyan
Write-Host '==================================================' -ForegroundColor Cyan
Write-Host ''

& $StartVm

$port = '3000'
if (Test-Path $EnvFile) {
    $reader = [System.IO.StreamReader]::new($EnvFile)
    try {
        while (($line = $reader.ReadLine()) -ne $null) {
            if ($line.StartsWith('APP_PORT=')) {
                $candidate = $line.Substring(9).Trim()
                if ($candidate) { $port = $candidate }
            }
        }
    } finally {
        $reader.Dispose()
    }
}

$baseUrl = "http://127.0.0.1:$port"
$readyUrl = "$baseUrl/api/ready"

Write-Host ''
Write-Host 'Verifying demo readiness endpoint...' -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri $readyUrl -UseBasicParsing -TimeoutSec 15
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
        throw "Unexpected readiness status: $($response.StatusCode)"
    }
} catch {
    throw "Demo service started but readiness verification failed: $($_.Exception.Message)"
}

Write-Host '[GO] Demo runtime is healthy and ready.' -ForegroundColor Green
Write-Host "Open: $baseUrl" -ForegroundColor Green
Write-Host 'Showcase guide: DEMO_FULL_SHOWCASE.md' -ForegroundColor Green
Write-Host ''

try {
    Start-Process $baseUrl
    Write-Host 'Default browser opened.' -ForegroundColor Green
} catch {
    Write-Host "Could not open browser automatically. Open manually: $baseUrl" -ForegroundColor Yellow
}
