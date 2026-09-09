$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LanguagesRoot = $env:MGC_LANGUAGES_PATH
if (-not $LanguagesRoot) { $LanguagesRoot = Join-Path (Split-Path $Root -Parent) 'mgc-languages' }

$OknoLauncher = Join-Path $Root 'scripts\start-vm.ps1'
$LanguagesLauncher = Join-Path $LanguagesRoot 'scripts\start-vm.ps1'
$StatusLauncher = Join-Path $Root 'scripts\status-both-vm.ps1'
$FirewallPreflight = Join-Path $Root 'scripts\host-firewall-preflight.ps1'

if (-not (Test-Path $OknoLauncher)) { throw "Okno v Kitai VM launcher not found: $OknoLauncher" }
if (-not (Test-Path $LanguagesLauncher)) {
    throw "MGC Languages was not found at '$LanguagesRoot'. Clone smilebbox-glitch/mgc-languages next to window-to-china or set MGC_LANGUAGES_PATH."
}
if (-not (Test-Path $StatusLauncher)) { throw "Shared VM status/security gate not found: $StatusLauncher" }
if (-not (Test-Path $FirewallPreflight)) { throw "Host firewall preflight not found: $FirewallPreflight" }

Write-Host '=== Host firewall preflight ===' -ForegroundColor Cyan
$firewallArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$FirewallPreflight)
if ($env:GITHUB_ACTIONS -eq 'true' -and $env:MGC_VM_FIREWALL_CONTRACT_ONLY -eq '1' -and $env:GITHUB_RUN_ID) {
    $firewallArgs += '-ContractOnly'
}
& powershell.exe @firewallArgs
if ($LASTEXITCODE -ne 0) {
    throw "Host firewall preflight failed with exit code $LASTEXITCODE. Run CONFIGURE_VM_FIREWALL.bat as Administrator before starting the pilot."
}

Write-Host ''
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
Write-Host '[GO] Both MGC test services passed host firewall, readiness and ingress isolation checks.' -ForegroundColor Green
Write-Host 'Okno v Kitai: http://127.0.0.1:3000' -ForegroundColor Green
Write-Host 'MGC Languages: http://127.0.0.1:8080' -ForegroundColor Green
Write-Host 'Use the VM IP only from the configured corporate CIDR.' -ForegroundColor DarkGray
