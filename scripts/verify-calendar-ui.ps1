param([switch]$Runtime)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $Root

function Fail([string]$Message) { throw $Message }

$calendarPath = Join-Path $Root 'components\event-calendar.tsx'
$hotelsPath = Join-Path $Root 'lib\trip-hotels.ts'

if (-not (Test-Path $calendarPath)) { Fail 'components/event-calendar.tsx is missing.' }
if (-not (Test-Path $hotelsPath)) { Fail 'lib/trip-hotels.ts is missing.' }

# Windows PowerShell 5.1 treats UTF-8 files without BOM as the active ANSI code page.
# Keep this verifier itself ASCII-only and decode project source files explicitly as UTF-8.
$calendar = Get-Content $calendarPath -Raw -Encoding UTF8
$hotels = Get-Content $hotelsPath -Raw -Encoding UTF8

# Unicode regex escapes keep Cyrillic out of this .ps1 file so it parses correctly on
# both legacy Windows PowerShell 5.1 and modern PowerShell.
$removedCalendarPattern = '\u0412\u0020\u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c'

if ($calendar -match $removedCalendarPattern) {
    Fail 'The local source is stale: the removed calendar control is still present.'
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
    $envText = Get-Content $envPath -Raw -Encoding UTF8
    $portMatch = [regex]::Match($envText, '(?m)^APP_PORT\s*=\s*([^\r\n#]+)')
    if ($portMatch.Success) { $port = $portMatch.Groups[1].Value.Trim() }
}

$url = "http://127.0.0.1:$port/calendar"
$response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 30
if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
    Fail "Calendar runtime returned HTTP $($response.StatusCode)."
}
$html = $response.Content
if ($html -match $removedCalendarPattern) {
    Fail 'STALE RUNTIME DETECTED: the running container still renders the removed calendar control.'
}
if ($html -notmatch 'trip\.com') {
    Fail 'STALE RUNTIME DETECTED: the running calendar does not contain Trip.com hotel links.'
}

Write-Host "PASS runtime: $url renders current calendar UI with Trip.com links" -ForegroundColor Green
