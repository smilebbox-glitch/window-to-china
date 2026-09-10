param([switch]$Runtime)
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $Root

function Fail([string]$Message) { throw $Message }

$calendarPath = Join-Path $Root 'components\pilot-event-calendar.tsx'
$hotelsPath = Join-Path $Root 'lib\trip-hotels.ts'

if (-not (Test-Path $calendarPath)) { Fail 'components/pilot-event-calendar.tsx is missing.' }
if (-not (Test-Path $hotelsPath)) { Fail 'lib/trip-hotels.ts is missing.' }

# Keep this verifier ASCII-only and decode project source files explicitly as UTF-8
# for compatibility with Windows PowerShell 5.1.
$calendar = Get-Content $calendarPath -Raw -Encoding UTF8
$hotels = Get-Content $hotelsPath -Raw -Encoding UTF8
$removedCalendarPattern = '\u0412\u0020\u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c'

if ($calendar -match $removedCalendarPattern) {
    Fail 'The active calendar source is stale: the removed calendar control is still present.'
}
if ($calendar -notmatch 'getTripHotels\(event\.id\)' -or $calendar -notmatch 'hotel\.tripUrl') {
    Fail 'The active calendar source is stale: hotel cards are not wired to Trip.com data.'
}
if ($calendar -notmatch 'data-calendar-ui="trip-direct-v1"') {
    Fail 'The active calendar source is missing the current runtime marker.'
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

Write-Host "PASS source: active calendar has no retired control + $($matches.Count) Trip.com hotel links" -ForegroundColor Green

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
$visibleHtml = [regex]::Replace($html, '(?is)<script\b[^>]*>.*?</script>', '')
$visibleHtml = [regex]::Replace($visibleHtml, '(?is)<style\b[^>]*>.*?</style>', '')

# Positive runtime identity check: this marker exists only on the calendar component
# mounted by app/calendar/page.tsx after the Trip.com cleanup. This is more reliable
# than searching arbitrary SSR/hydration text for an old label.
if ($visibleHtml -notmatch 'data-calendar-ui=["'']trip-direct-v1["'']') {
    Fail 'STALE RUNTIME DETECTED: /calendar is not rendering the current PilotEventCalendar.'
}

$directTripHotelPattern = 'https://www\.trip\.com/hotels/(?:v2/)?[^"''<>\s]*hotel-detail-\d+'
$runtimeTripMatches = [regex]::Matches($visibleHtml, $directTripHotelPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
if ($runtimeTripMatches.Count -eq 0) {
    Fail 'STALE RUNTIME DETECTED: visible calendar markup does not contain direct Trip.com hotel-detail links.'
}

Write-Host "PASS runtime: $url renders current PilotEventCalendar + $($runtimeTripMatches.Count) direct Trip.com hotel link(s)" -ForegroundColor Green
