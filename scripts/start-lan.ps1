$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $Root
$EnvPath = Join-Path $Root '.env'
. (Join-Path $PSScriptRoot 'env-file-utils.ps1')

function Get-EnvValue([string]$Key) {
    return (Get-EnvFileValue -Path $EnvPath -Key $Key)
}

function Set-EnvValue([string]$Key, [string]$Value) {
    Set-EnvFileValue -Path $EnvPath -Key $Key -Value $Value
}

function Test-Administrator {
    try {
        $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
        $principal = New-Object Security.Principal.WindowsPrincipal($identity)
        return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    } catch { return $false }
}

function Test-TcpPortAvailable([int]$Port) {
    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        return $true
    } catch {
        return $false
    } finally {
        if ($listener) {
            try { $listener.Stop() } catch {}
        }
    }
}

function Get-PortOwnerText([int]$Port) {
    try {
        $connections = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop)
        if (-not $connections) { return '' }
        $parts = foreach ($c in $connections) {
            $pidValue = $c.OwningProcess
            $name = ''
            try { $name = (Get-Process -Id $pidValue -ErrorAction Stop).ProcessName } catch {}
            if ($name) { "PID $pidValue ($name)" } else { "PID $pidValue" }
        }
        return (($parts | Select-Object -Unique) -join ', ')
    } catch { return '' }
}

function Stop-OldOknoContainers([int]$Port) {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { return }
    try {
        $ids = @(& docker ps -q --filter 'label=com.mgc.service=okno-v-kitai' --filter "publish=$Port" 2>$null) |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        if ($ids.Count -gt 0) {
            Write-Host "Found an older Okno v Kitai container on port $Port. Replacing it..." -ForegroundColor Yellow
            & docker rm -f $ids *> $null
            Start-Sleep -Seconds 2
        }
    } catch {
        Write-Warning "Could not clean up the previous Okno v Kitai container: $($_.Exception.Message)"
    }
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

# Force LAN mode even when an older .env still contains localhost-only settings.
Set-EnvValue 'APP_BIND_ADDRESS' '0.0.0.0'
Set-EnvValue 'ALLOW_PUBLIC_BIND' 'YES'

$rawPort = Get-EnvValue 'APP_PORT'
$port = 3000
$parsedPort = 0
if (-not [string]::IsNullOrWhiteSpace($rawPort) -and [int]::TryParse($rawPort, [ref]$parsedPort) -and $parsedPort -ge 1024 -and $parsedPort -le 65535) {
    $port = $parsedPort
} else {
    Set-EnvValue 'APP_PORT' '3000'
}

# First remove only an older running container that belongs to this application.
Stop-OldOknoContainers $port

# If another application owns the requested port, leave it untouched and move Okno v Kitai
# to the next free port. This avoids repeated "port is already allocated" failures.
if (-not (Test-TcpPortAvailable $port)) {
    $owner = Get-PortOwnerText $port
    if ($owner) {
        Write-Host "Port $port is occupied by $owner." -ForegroundColor Yellow
    } else {
        Write-Host "Port $port is already occupied." -ForegroundColor Yellow
    }

    $freePort = $null
    foreach ($candidate in 3001..3099) {
        if (Test-TcpPortAvailable $candidate) {
            $freePort = $candidate
            break
        }
    }
    if (-not $freePort) {
        throw 'No free TCP port was found in range 3001-3099. Close the conflicting application or configure APP_PORT manually.'
    }

    $port = [int]$freePort
    Set-EnvValue 'APP_PORT' ([string]$port)
    Write-Host "Using free port $port instead. The browser URL will include this port." -ForegroundColor Green
} else {
    Set-EnvValue 'APP_PORT' ([string]$port)
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
    $lanUrl = "http://${lanIp}:$port"
    Write-Host "Other PCs:     $lanUrl" -ForegroundColor Green
    try {
        $probe = Invoke-WebRequest -UseBasicParsing -Uri ($lanUrl + '/api/health') -TimeoutSec 10
        if ($probe.StatusCode -ge 200 -and $probe.StatusCode -lt 300) {
            Write-Host 'LAN self-test from this PC: PASS' -ForegroundColor Green
        }
    } catch {
        Write-Host 'LAN self-test from this PC: FAILED. Windows/network policy may be blocking access to the host LAN address.' -ForegroundColor Yellow
    }
    Write-Host "Open that exact address on another PC in the same corporate/local network."
} else {
    Write-Host "Could not detect LAN IPv4 automatically. Run ipconfig and open http://<IPv4>:$port on another PC." -ForegroundColor Yellow
}
Write-Host '================================================' -ForegroundColor Cyan
