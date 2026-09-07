$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $Root

function Get-EnvValue([string]$Key) {
    if (-not (Test-Path '.env')) { return '' }
    $line = Get-Content '.env' | Where-Object { $_ -match ('^' + [regex]::Escape($Key) + '=') } | Select-Object -Last 1
    if (-not $line) { return '' }
    return $line.Substring($Key.Length + 1)
}

function Set-EnvValue([string]$Key, [string]$Value) {
    $lines = if (Test-Path '.env') { @(Get-Content '.env') } else { @() }
    $found = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match ('^' + [regex]::Escape($Key) + '=')) {
            $lines[$i] = "$Key=$Value"
            $found = $true
        }
    }
    if (-not $found) { $lines += "$Key=$Value" }
    [System.IO.File]::WriteAllLines((Join-Path $Root '.env'), $lines, [System.Text.UTF8Encoding]::new($false))
}

function Test-Administrator {
    try {
        $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
        $principal = New-Object Security.Principal.WindowsPrincipal($identity)
        return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    } catch { return $false }
}

function Get-LanIPv4 {
    try {
        $route = Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop |
            Where-Object { $_.NextHop -ne '0.0.0.0' } |
            Sort-Object RouteMetric, InterfaceMetric |
            Select-Object -First 1
        if ($route) {
            $ip = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $route.InterfaceIndex -ErrorAction Stop |
                Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254\.' } |
                Select-Object -ExpandProperty IPAddress -First 1
            if ($ip) { return $ip }
        }
    } catch {}

    try {
        $ips = [System.Net.Dns]::GetHostAddresses($env:COMPUTERNAME) |
            Where-Object {
                $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
                $_.IPAddressToString -notmatch '^127\.' -and
                $_.IPAddressToString -notmatch '^169\.254\.'
            }
        $preferred = $ips | Where-Object { $_.IPAddressToString -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)' } | Select-Object -First 1
        if ($preferred) { return $preferred.IPAddressToString }
        if ($ips) { return ($ips | Select-Object -First 1).IPAddressToString }
    } catch {}

    try {
        $text = (& ipconfig) -join "`n"
        $matches = [regex]::Matches($text, '(?m)IPv4[^:]*:\s*(\d{1,3}(?:\.\d{1,3}){3})')
        foreach ($m in $matches) {
            $ip = $m.Groups[1].Value
            if ($ip -notmatch '^127\.' -and $ip -notmatch '^169\.254\.') { return $ip }
        }
    } catch {}

    return ''
}

if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
}

# Force the user-requested LAN mode even when an older .env still contains localhost-only settings.
Set-EnvValue 'APP_BIND_ADDRESS' '0.0.0.0'
Set-EnvValue 'ALLOW_PUBLIC_BIND' 'YES'
$port = Get-EnvValue 'APP_PORT'
if ([string]::IsNullOrWhiteSpace($port)) {
    $port = '3000'
    Set-EnvValue 'APP_PORT' $port
}

Write-Host "LAN mode enabled: 0.0.0.0:$port" -ForegroundColor Cyan

# On an elevated first run, open only this application port, only for trusted local subnets,
# and only on Windows Domain/Private profiles. Nothing is opened for the Public profile.
$ruleName = "Okno v Kitai LAN TCP $port"
if (Get-Command Get-NetFirewallRule -ErrorAction SilentlyContinue) {
    $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if (-not $existing) {
        if (Test-Administrator) {
            try {
                New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Domain,Private -RemoteAddress LocalSubnet | Out-Null
                Write-Host "Windows Firewall: allowed TCP $port from LocalSubnet on Domain/Private profiles." -ForegroundColor Green
            } catch {
                Write-Warning "Could not create Windows Firewall rule: $($_.Exception.Message)"
            }
        } else {
            Write-Host "Windows Firewall rule is not installed yet. If another PC cannot connect, run START.bat once as Administrator." -ForegroundColor Yellow
        }
    }
}

& (Join-Path $PSScriptRoot 'one-click-start.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$lanIp = Get-LanIPv4
Write-Host ''
Write-Host '================ NETWORK ACCESS ================' -ForegroundColor Cyan
Write-Host "This PC:       http://127.0.0.1:$port" -ForegroundColor Green
if ($lanIp) {
    Write-Host "Other PCs:     http://${lanIp}:$port" -ForegroundColor Green
    Write-Host "Open that exact address on another PC in the same corporate/local network."
} else {
    Write-Host "Could not detect LAN IPv4 automatically. Run ipconfig and open http://<IPv4>:$port on another PC." -ForegroundColor Yellow
}
Write-Host '================================================' -ForegroundColor Cyan
