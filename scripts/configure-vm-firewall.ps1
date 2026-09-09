param(
    [string]$AllowedCidr
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$HostEnv = $env:MGC_VM_HOST_ENV
if (-not $HostEnv) { $HostEnv = Join-Path $Root '.env.vm-host' }
$Preflight = Join-Path $Root 'scripts\host-firewall-preflight.ps1'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run CONFIGURE_VM_FIREWALL.bat as Administrator.'
}

function Get-SmallEnvValue([string]$Path, [string]$Key) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return '' }
    $value = ''
    $reader = [System.IO.StreamReader]::new($Path)
    try {
        while (($line = $reader.ReadLine()) -ne $null) {
            if ($line.StartsWith("$Key=")) { $value = $line.Substring($Key.Length + 1).Trim() }
        }
    } finally { $reader.Dispose() }
    return $value
}

if (-not $AllowedCidr) { $AllowedCidr = $env:MGC_VM_ALLOWED_CIDR }
if (-not $AllowedCidr) { $AllowedCidr = Get-SmallEnvValue $HostEnv 'MGC_VM_ALLOWED_CIDR' }
if (-not $AllowedCidr -or $AllowedCidr.StartsWith('CHANGE_ME_')) {
    Write-Host 'Enter the approved corporate IPv4 CIDR that may access this VM.' -ForegroundColor Cyan
    Write-Host 'Example: 10.20.30.0/24' -ForegroundColor DarkGray
    $AllowedCidr = Read-Host 'Corporate CIDR'
}

$oldGitHubActions = $env:GITHUB_ACTIONS
$oldContract = $env:MGC_VM_FIREWALL_CONTRACT_ONLY
$oldCidr = $env:MGC_VM_ALLOWED_CIDR
try {
    $env:GITHUB_ACTIONS = 'true'
    $env:MGC_VM_FIREWALL_CONTRACT_ONLY = '1'
    $env:MGC_VM_ALLOWED_CIDR = $AllowedCidr
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Preflight -ContractOnly
    if ($LASTEXITCODE -ne 0) { throw "CIDR validation failed with exit code $LASTEXITCODE." }
} finally {
    if ($null -eq $oldGitHubActions) { Remove-Item Env:GITHUB_ACTIONS -ErrorAction SilentlyContinue } else { $env:GITHUB_ACTIONS = $oldGitHubActions }
    if ($null -eq $oldContract) { Remove-Item Env:MGC_VM_FIREWALL_CONTRACT_ONLY -ErrorAction SilentlyContinue } else { $env:MGC_VM_FIREWALL_CONTRACT_ONLY = $oldContract }
    if ($null -eq $oldCidr) { Remove-Item Env:MGC_VM_ALLOWED_CIDR -ErrorAction SilentlyContinue } else { $env:MGC_VM_ALLOWED_CIDR = $oldCidr }
}

if (-not (Get-Command Get-NetFirewallProfile -ErrorAction SilentlyContinue)) { throw 'Windows Defender Firewall PowerShell cmdlets are unavailable.' }
foreach ($profile in @(Get-NetFirewallProfile)) {
    if (-not $profile.Enabled) { throw "Windows Firewall profile '$($profile.Name)' is disabled. Enable the corporate firewall baseline first." }
    if ([string]$profile.DefaultInboundAction -eq 'Allow') { throw "Windows Firewall profile '$($profile.Name)' has DefaultInboundAction=Allow. Use a deny/block inbound baseline first." }
}

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText(
    $HostEnv,
    "# Local host firewall boundary for the temporary dual-service VM.`r`nMGC_VM_ALLOWED_CIDR=$AllowedCidr`r`n",
    $utf8NoBom
)

foreach ($port in @(3000, 8080)) {
    $ruleName = "MGC VM - TCP $port from corporate subnet"
    Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
    New-NetFirewallRule `
        -DisplayName $ruleName `
        -Group 'MGC Temporary VM' `
        -Direction Inbound `
        -Action Allow `
        -Enabled True `
        -Profile Domain,Private `
        -Protocol TCP `
        -LocalPort $port `
        -RemoteAddress $AllowedCidr | Out-Null
}

$env:MGC_VM_ALLOWED_CIDR = $AllowedCidr
try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Preflight
    if ($LASTEXITCODE -ne 0) { throw "Firewall preflight failed with exit code $LASTEXITCODE. Check for another broad inbound allow rule on TCP 3000/8080." }
} finally {
    if ($null -eq $oldCidr) { Remove-Item Env:MGC_VM_ALLOWED_CIDR -ErrorAction SilentlyContinue } else { $env:MGC_VM_ALLOWED_CIDR = $oldCidr }
}

Write-Host "[GO] Windows VM firewall configured for $AllowedCidr only on TCP 3000 and 8080." -ForegroundColor Green
