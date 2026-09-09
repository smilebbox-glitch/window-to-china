$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LanguagesRoot = $env:MGC_LANGUAGES_PATH
if (-not $LanguagesRoot) { $LanguagesRoot = Join-Path (Split-Path $Root -Parent) 'mgc-languages' }
$rc = 0

function Get-SmallEnvValue([string]$Path, [string]$Key, [string]$Default) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $Default }
    $value = $null
    $reader = [System.IO.StreamReader]::new($Path)
    try {
        while (($line = $reader.ReadLine()) -ne $null) {
            if ($line.StartsWith("$Key=")) { $value = $line.Substring($Key.Length + 1) }
        }
    } finally { $reader.Dispose() }
    if ([string]::IsNullOrWhiteSpace($value)) { return $Default }
    return $value.Trim()
}

function Get-ContainerHealth([string]$ContainerId) {
    if ([string]::IsNullOrWhiteSpace($ContainerId)) { return 'not-running' }
    $health = [string](& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $ContainerId 2>$null)
    if ([string]::IsNullOrWhiteSpace($health)) { return 'unknown' }
    return $health.Trim()
}

function Test-ReadyUrl([string]$Url) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
        return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300)
    } catch { return $false }
}

function Get-InspectValue([string]$ContainerId, [string]$Format) {
    if ([string]::IsNullOrWhiteSpace($ContainerId)) { return '' }
    $value = [string](& docker inspect --format $Format $ContainerId 2>$null)
    return $value.Trim()
}

function Test-NoPublishedPorts([string]$ContainerId) {
    if ([string]::IsNullOrWhiteSpace($ContainerId)) { return $false }
    $ports = [string](& docker port $ContainerId 2>$null)
    return [string]::IsNullOrWhiteSpace($ports)
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker is not installed or not in PATH.' }
& docker info *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker daemon is not running.' }
& docker compose version *> $null
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose v2 is required.' }

Write-Host '=== Okno v Kitai VM ===' -ForegroundColor Cyan
$oknoEnv = Join-Path $Root '.env.vm'
if (-not (Test-Path -LiteralPath (Join-Path $Root 'compose.yaml')) -or -not (Test-Path -LiteralPath (Join-Path $Root 'compose.vm.yaml'))) {
    Write-Host "[NO-GO] Okno VM files are missing: $Root" -ForegroundColor Red
    $rc = 1
} elseif (-not (Test-Path -LiteralPath $oknoEnv -PathType Leaf)) {
    Write-Host '[NO-GO] .env.vm is missing. Run START_BOTH_VM first.' -ForegroundColor Red
    $rc = 1
} else {
    $oknoPort = Get-SmallEnvValue $oknoEnv 'APP_PORT' '3000'
    Push-Location $Root
    try {
        $oknoArgs = @('compose','--env-file','.env.vm','-f','compose.yaml','-f','compose.vm.yaml')
        & docker @oknoArgs ps
        $oknoCid = ([string](& docker @oknoArgs ps -q china-auto-radar 2>$null)).Trim()
        $oknoSchedulerCid = ([string](& docker @oknoArgs ps -q china-auto-radar-scheduler 2>$null)).Trim()
    } finally { Pop-Location }
    $oknoHealth = Get-ContainerHealth $oknoCid
    $oknoUrl = "http://127.0.0.1:$oknoPort/api/ready"
    if ($oknoHealth -eq 'healthy' -and (Test-ReadyUrl $oknoUrl)) {
        Write-Host "[GO] Okno v Kitai: healthy - http://127.0.0.1:$oknoPort" -ForegroundColor Green
    } else {
        Write-Host "[NO-GO] Okno v Kitai: $oknoHealth" -ForegroundColor Red
        $rc = 1
    }

    if ([string]::IsNullOrWhiteSpace($oknoCid) -or [string]::IsNullOrWhiteSpace($oknoSchedulerCid)) {
        Write-Host '[NO-GO] Okno VM ingress isolation: app/scheduler container set is incomplete.' -ForegroundColor Red
        $rc = 1
    } else {
        $oknoReadonly = Get-InspectValue $oknoCid '{{.HostConfig.ReadonlyRootfs}}'
        $oknoSecurity = Get-InspectValue $oknoCid '{{json .HostConfig.SecurityOpt}}'
        $oknoDrop = Get-InspectValue $oknoCid '{{json .HostConfig.CapDrop}}'
        $oknoAdd = Get-InspectValue $oknoCid '{{json .HostConfig.CapAdd}}'
        $oknoPortMap = [string](& docker port $oknoCid '3000/tcp' 2>$null)
        $oknoAllPorts = [string](& docker port $oknoCid 2>$null)
        $unexpectedOknoPorts = @($oknoAllPorts -split "`r?`n" | Where-Object { $_ -and $_ -notmatch '^3000/tcp -> ' })

        $oknoGatewayOk = $true
        if ($oknoReadonly -ne 'true') { $oknoGatewayOk = $false }
        if ($oknoSecurity -notmatch 'no-new-privileges') { $oknoGatewayOk = $false }
        if ($oknoDrop -notmatch 'ALL') { $oknoGatewayOk = $false }
        if ($oknoAdd -ne 'null' -and $oknoAdd -ne '[]') { $oknoGatewayOk = $false }
        if ($oknoPortMap -notmatch ":$([regex]::Escape($oknoPort))(?:\s|$)") { $oknoGatewayOk = $false }
        if ([string]::IsNullOrWhiteSpace($oknoAllPorts)) { $oknoGatewayOk = $false }
        if ($unexpectedOknoPorts.Count -gt 0) { $oknoGatewayOk = $false }
        if (-not (Test-NoPublishedPorts $oknoSchedulerCid)) { $oknoGatewayOk = $false }

        if ($oknoGatewayOk) {
            Write-Host "[GO] Okno v Kitai ingress isolation: only hardened app port $oknoPort is published; scheduler is internal." -ForegroundColor Green
        } else {
            Write-Host '[NO-GO] Okno v Kitai ingress isolation does not match the temporary VM contract.' -ForegroundColor Red
            $rc = 1
        }
    }
}

Write-Host ''
Write-Host '=== MGC Languages VM ===' -ForegroundColor Cyan
$langEnv = Join-Path $LanguagesRoot '.env.vm'
if (-not (Test-Path -LiteralPath (Join-Path $LanguagesRoot 'docker-compose.lan.yml')) -or -not (Test-Path -LiteralPath (Join-Path $LanguagesRoot 'docker-compose.vm.yml'))) {
    Write-Host "[NO-GO] MGC Languages was not found at: $LanguagesRoot" -ForegroundColor Red
    $rc = 1
} elseif (-not (Test-Path -LiteralPath $langEnv -PathType Leaf)) {
    Write-Host '[NO-GO] MGC Languages .env.vm is missing. Run START_BOTH_VM first.' -ForegroundColor Red
    $rc = 1
} else {
    $langPort = Get-SmallEnvValue $langEnv 'MGC_PORT' '8080'
    Push-Location $LanguagesRoot
    try {
        $langArgs = @('compose','--env-file','.env.vm','-f','docker-compose.lan.yml','-f','docker-compose.vm.yml')
        & docker @langArgs ps
        $langCid = ([string](& docker @langArgs ps -q app 2>$null)).Trim()
        $langDbCid = ([string](& docker @langArgs ps -q db 2>$null)).Trim()
        $langNginxCid = ([string](& docker @langArgs ps -q nginx 2>$null)).Trim()
    } finally { Pop-Location }
    $langHealth = Get-ContainerHealth $langCid
    $langUrl = "http://127.0.0.1:$langPort/health/ready"
    if ($langHealth -eq 'healthy' -and (Test-ReadyUrl $langUrl)) {
        Write-Host "[GO] MGC Languages: healthy - http://127.0.0.1:$langPort" -ForegroundColor Green
    } else {
        Write-Host "[NO-GO] MGC Languages: $langHealth" -ForegroundColor Red
        $rc = 1
    }

    if ([string]::IsNullOrWhiteSpace($langDbCid) -or [string]::IsNullOrWhiteSpace($langNginxCid)) {
        Write-Host '[NO-GO] MGC Languages ingress isolation: app/db/nginx container set is incomplete.' -ForegroundColor Red
        $rc = 1
    } else {
        $nginxReadonly = Get-InspectValue $langNginxCid '{{.HostConfig.ReadonlyRootfs}}'
        $nginxSecurity = Get-InspectValue $langNginxCid '{{json .HostConfig.SecurityOpt}}'
        $nginxDrop = Get-InspectValue $langNginxCid '{{json .HostConfig.CapDrop}}'
        $nginxAdd = Get-InspectValue $langNginxCid '{{json .HostConfig.CapAdd}}'
        $nginxPorts = [string](& docker port $langNginxCid '8080/tcp' 2>$null)

        $gatewayOk = $true
        if (-not (Test-NoPublishedPorts $langCid)) { $gatewayOk = $false }
        if (-not (Test-NoPublishedPorts $langDbCid)) { $gatewayOk = $false }
        if ($nginxReadonly -ne 'true') { $gatewayOk = $false }
        if ($nginxSecurity -notmatch 'no-new-privileges') { $gatewayOk = $false }
        if ($nginxDrop -notmatch 'ALL') { $gatewayOk = $false }
        foreach ($capability in @('CHOWN','SETGID','SETUID')) {
            if ($nginxAdd -notmatch $capability) { $gatewayOk = $false }
        }
        if ($nginxAdd -match 'SYS_ADMIN|NET_ADMIN|SYS_PTRACE|DAC_OVERRIDE') { $gatewayOk = $false }
        if ($nginxPorts -notmatch ":$([regex]::Escape($langPort))(?:\s|$)") { $gatewayOk = $false }

        if ($gatewayOk) {
            Write-Host "[GO] MGC Languages ingress isolation: only hardened nginx publishes LAN port $langPort." -ForegroundColor Green
        } else {
            Write-Host '[NO-GO] MGC Languages ingress isolation does not match the hardened VM contract.' -ForegroundColor Red
            $rc = 1
        }
    }
}

Write-Host ''
if ($rc -eq 0) {
    Write-Host '[GO] Both VM services are ready and ingress isolation is valid.' -ForegroundColor Green
} else {
    Write-Host '[NO-GO] At least one VM service needs attention.' -ForegroundColor Red
}
exit $rc
