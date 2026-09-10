param([switch]$Runtime)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $Root

function Fail([string]$Message) { throw $Message }

$calendarPath = Join-Path $Root 'components\event-calendar.tsx'
$hotelsPath = Join-Path $Root 'lib\trip-hotels.ts'

if (-not (Test-Path $calendarPath)) { Fail 'components/event-calendar.tsx is missing.' }
if (-not (Test-Path $hotelsPath)) { Fail 'lib/trip-hotels.ts is missing.' }

$calendar = Get-Content $calendarPath -Raw
$hotels = Get-Content $hotelsPath -Raw

if ($calendar -match 'В календарь') {
    Fail 'The local source is stale: the removed "В календарь" control is still present.'
}
if ($calendar -notmatch 'hotel\.tripUrl') {
    Fail 'The local source is stale: calendar hotel cards are not wired to Trip.com URLs.'
}

$matches = [regex]::Matches($hotels, 'tripUrl\s*:\s*"([^"]+)"')
if ($matches.Count -eq 0) { Fail 'No Trip.com hotel URLs were found in lib/trip-hotels.ts.' }
foreach ($match in $matches) {
    $url = $match.Groups[1].Value
    try { $uri = [Uri]$url } catch { Fail "Invalid hotel URL: $url" }
    if ($uri.Scheme -ne 'https' -or $uri.Host -notin @('trip.com', 'www.trip.com')) {
        Fail "Hotel URL is not a direct Trip.com URL: $url"
    }
}

Write-Host "PASS source: removed calendar button + $($matches.Count) Trip.com hotel links" -ForegroundColor Green

if (-not $Runtime) { exit 0 }

$port = '3000'
$envPath = Join-Path $Root '.env'
if (Test-Path $envPath) {
    $envText = Get-Content $envPath -Raw
    $portMatch = [regex]::Match($envText, '(?m)^APP_PORT\s*=\s*([^\r\n#]+)')
    if ($portMatch.Success) { $port = $portMatch.Groups[1].Value.Trim() }
}

$url = "http://127.0.0.1:$port/calendar"
$response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 30
if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
    Fail "Calendar runtime returned HTTP $($response.StatusCode)."
}
$html = $response.Content
if ($html -match 'В календарь') {
    Fail 'STALE RUNTIME DETECTED: the running container still renders the removed "В календарь" control.'
}
if ($html -notmatch 'trip\.com') {
    Fail 'STALE RUNTIME DETECTED: the running calendar does not contain Trip.com hotel links.'
}

Write-Host "PASS runtime: $url renders current calendar UI with Trip.com links" -ForegroundColor Green
