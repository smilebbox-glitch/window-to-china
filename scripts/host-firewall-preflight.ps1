param(
    [switch]$ContractOnly
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$HostEnv = $env:MGC_VM_HOST_ENV
if (-not $HostEnv) { $HostEnv = Join-Path $Root '.env.vm-host' }

function Fail([string]$Message) {
    Write-Host "[NO-GO] $Message" -ForegroundColor Red
    exit 1
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

function Test-ApprovedPrivateCidr([string]$Cidr) {
    if ($Cidr -notmatch '^([^/]+)/([0-9]{1,2})$') { Fail 'MGC_VM_ALLOWED_CIDR must be an IPv4 CIDR, for example 10.20.30.0/24.' }
    $ipText = $Matches[1]
    $prefix = [int]$Matches[2]
    if ($prefix -lt 8 -or $prefix -gt 32) { Fail "CIDR must be /8 or narrower; public-wide ranges are rejected: $Cidr" }

    $ip = $null
    if (-not [System.Net.IPAddress]::TryParse($ipText, [ref]$ip)) { Fail "IPv4 address is invalid: $Cidr" }
    if ($ip.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) { Fail "Only IPv4 CIDRs are accepted for this temporary pilot: $Cidr" }
    $bytes = $ip.GetAddressBytes()

    $remaining = $prefix
    for ($i = 0; $i -lt 4; $i++) {
        if ($remaining -ge 8) { $bits = 8 }
        elseif ($remaining -gt 0) { $bits = $remaining }
        else { $bits = 0 }
        if ($bits -eq 0) { $mask = 0 }
        else { $mask = 256 - (1 -shl (8 - $bits)) }
        if (($bytes[$i] -band $mask) -ne $bytes[$i]) { Fail "CIDR must use the canonical network address (host bits must be zero): $Cidr" }
        $remaining -= 8
    }

    $a = [int]$bytes[0]
    $b = [int]$bytes[1]
    $private = ($a -eq 10) -or
               ($a -eq 172 -and $b -ge 16 -and $b -le 31) -or
               ($a -eq 192 -and $b -eq 168) -or
               ($a -eq 100 -and $b -ge 64 -and $b -le 127)
    if (-not $private) { Fail "Allowed CIDR must be RFC1918 or CGNAT private space for this temporary pilot: $Cidr" }
}

$AllowedCidr = $env:MGC_VM_ALLOWED_CIDR
if (-not $AllowedCidr) { $AllowedCidr = Get-SmallEnvValue $HostEnv 'MGC_VM_ALLOWED_CIDR' }
if (-not $AllowedCidr) { Fail "Missing $HostEnv. Copy .env.vm-host.example to .env.vm-host and set MGC_VM_ALLOWED_CIDR." }
if ($AllowedCidr.StartsWith('CHANGE_ME_')) { Fail "MGC_VM_ALLOWED_CIDR is still a placeholder in $HostEnv." }
Test-ApprovedPrivateCidr $AllowedCidr

if ($ContractOnly) {
    if ($env:GITHUB_ACTIONS -ne 'true' -or $env:MGC_VM_FIREWALL_CONTRACT_ONLY -ne '1') {
        Fail '-ContractOnly is reserved for the GitHub Actions verification job.'
    }
    Write-Host "[GO] Host firewall contract is syntactically valid for CI: $AllowedCidr -> TCP 3000,8080." -ForegroundColor Green
    exit 0
}

if (-not (Get-Command Get-NetFirewallProfile -ErrorAction SilentlyContinue)) { Fail 'Windows Defender Firewall PowerShell cmdlets are unavailable.' }

$profiles = @(Get-NetFirewallProfile)
if ($profiles.Count -eq 0) { Fail 'No Windows Firewall profiles were returned.' }
foreach ($profile in $profiles) {
    if (-not $profile.Enabled) { Fail "Windows Firewall profile '$($profile.Name)' is disabled." }
    if ([string]$profile.DefaultInboundAction -eq 'Allow') { Fail "Windows Firewall profile '$($profile.Name)' has DefaultInboundAction=Allow." }
}

$allInboundAllows = @(Get-NetFirewallRule -Enabled True -Direction Inbound -Action Allow -ErrorAction SilentlyContinue)
foreach ($port in @(3000, 8080)) {
    $ruleName = "MGC VM - TCP $port from corporate subnet"
    $rules = @(Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)
    if ($rules.Count -ne 1) { Fail "Expected exactly one restricted Windows Firewall rule named '$ruleName'. Run CONFIGURE_VM_FIREWALL.bat as Administrator." }
    $rule = $rules[0]
    if (-not $rule.Enabled -or [string]$rule.Direction -ne 'Inbound' -or [string]$rule.Action -ne 'Allow') { Fail "Firewall rule '$ruleName' is not an enabled inbound allow rule." }
    if ([string]$rule.Profile -match 'Public|Any') { Fail "Firewall rule '$ruleName' must not allow the Public/Any profile." }

    $portFilters = @($rule | Get-NetFirewallPortFilter -ErrorAction Stop)
    if ($portFilters.Count -ne 1 -or [string]$portFilters[0].Protocol -notmatch 'TCP|6' -or [string]$portFilters[0].LocalPort -ne [string]$port) {
        Fail "Firewall rule '$ruleName' does not match TCP local port $port."
    }
    $addressFilters = @($rule | Get-NetFirewallAddressFilter -ErrorAction Stop)
    if ($addressFilters.Count -ne 1 -or @($addressFilters[0].RemoteAddress) -notcontains $AllowedCidr) {
        Fail "Firewall rule '$ruleName' is not restricted to $AllowedCidr."
    }

    foreach ($candidate in $allInboundAllows) {
        if ($candidate.DisplayName -eq $ruleName) { continue }
        $pf = @($candidate | Get-NetFirewallPortFilter -ErrorAction SilentlyContinue)
        if ($pf.Count -eq 0) { continue }
        $explicitPortMatch = $false
        foreach ($filter in $pf) {
            $localPorts = @($filter.LocalPort)
            if ([string]$filter.Protocol -match 'TCP|6' -and ($localPorts -contains [string]$port -or $localPorts -contains $port)) {
                $explicitPortMatch = $true
            }
        }
        if (-not $explicitPortMatch) { continue }
        $af = @($candidate | Get-NetFirewallAddressFilter -ErrorAction SilentlyContinue)
        foreach ($addressFilter in $af) {
            $remote = @($addressFilter.RemoteAddress | ForEach-Object { [string]$_ })
            if ($remote -contains 'Any' -or $remote -contains '0.0.0.0/0' -or $remote -contains 'Internet' -or $remote -contains 'LocalSubnet') {
                Fail "Broad inbound allow rule '$($candidate.DisplayName)' also exposes TCP $port. Remove or narrow it before starting the pilot."
            }
        }
    }
}

Write-Host "[GO] Windows host firewall is fail-closed: only $AllowedCidr may reach TCP 3000 and 8080 on Domain/Private profiles." -ForegroundColor Green
