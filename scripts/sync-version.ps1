$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$packagePath = Join-Path $Root 'package.json'
$envExamplePath = Join-Path $Root '.env.example'
$envPath = Join-Path $Root '.env'

$package = Get-Content $packagePath -Raw | ConvertFrom-Json
$version = [string]$package.version
if ([string]::IsNullOrWhiteSpace($version) -or $version -notmatch '^\d+\.\d+\.\d+-pilot$') {
    throw "Invalid pilot version in package.json: '$version'"
}

if (-not (Test-Path $envPath)) {
    Copy-Item $envExamplePath $envPath
}

$lines = @(Get-Content $envPath)
$found = $false
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^APP_VERSION=') {
        $lines[$i] = "APP_VERSION=$version"
        $found = $true
    }
}
if (-not $found) {
    $lines += "APP_VERSION=$version"
}

[System.IO.File]::WriteAllLines($envPath, $lines, [System.Text.UTF8Encoding]::new($false))
Write-Host "Pilot version synchronized: $version" -ForegroundColor Green
