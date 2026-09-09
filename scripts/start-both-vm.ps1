$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LanguagesRoot = $env:MGC_LANGUAGES_PATH
if (-not $LanguagesRoot) { $LanguagesRoot = Join-Path (Split-Path $Root -Parent) 'mgc-languages' }

$OknoLauncher = Join-Path $Root 'scripts\start-vm.ps1'
$LanguagesLauncher = Join-Path $LanguagesRoot 'scripts\start-vm.ps1'
$StatusLauncher = Join-Path $Root 'scripts\status-both-vm.ps1'

if (-not (Test-Path $OknoLauncher)) { throw "Okno v Kitai VM launcher not found: $OknoLauncher" }
if (-not (Test-Path $LanguagesLauncher)) {
    throw "MGC Languages was not found at '$LanguagesRoot'. Clone smilebbox-glitch/mgc-languages next to window-to-china or set MGC_LANGUAGES_PATH."
}
if (-not (Test-Path $StatusLauncher)) { throw "Shared VM status/security gate not found: $StatusLauncher" }

Write-Host '=== Starting Okno v Kitai ===' -ForegroundColor Cyan
& $OknoLauncher

Write-Host ''
Write-Host '=== Starting MGC Languages ===' -ForegroundColor Cyan
Push-Location $LanguagesRoot
try { & $LanguagesLauncher } finally { Pop-Location }

Write-Host ''
Write-Host '=== Final readiness + ingress isolation gate ===' -ForegroundColor Cyan
$previousLanguagesPath = $env:MGC_LANGUAGES_PATH
$env:MGC_LANGUAGES_PATH = $LanguagesRoot
try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $StatusLauncher
    if ($LASTEXITCODE -ne 0) { throw "Shared VM status/security gate failed with exit code $LASTEXITCODE." }
} finally {
    if ($null -eq $previousLanguagesPath) { Remove-Item Env:MGC_LANGUAGES_PATH -ErrorAction SilentlyContinue }
    else { $env:MGC_LANGUAGES_PATH = $previousLanguagesPath }
}

Write-Host ''
Write-Host '[GO] Both MGC test services passed readiness and ingress isolation checks.' -ForegroundColor Green
Write-Host 'Okno v Kitai: http://127.0.0.1:3000' -ForegroundColor Green
Write-Host 'MGC Languages: http://127.0.0.1:8080' -ForegroundColor Green
Write-Host 'Use the VM IP instead of 127.0.0.1 from other approved LAN PCs.' -ForegroundColor DarkGray
