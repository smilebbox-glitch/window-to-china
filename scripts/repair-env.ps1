$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$EnvPath = Join-Path $Root '.env'
$ExamplePath = Join-Path $Root '.env.example'
$MaxEnvBytes = 1MB

if (-not (Test-Path -LiteralPath $ExamplePath -PathType Leaf)) {
    throw '.env.example is missing. Restore the project files from GitHub and try again.'
}

if (-not (Test-Path -LiteralPath $EnvPath)) {
    Copy-Item -LiteralPath $ExamplePath -Destination $EnvPath
    Write-Host 'Created .env from .env.example.' -ForegroundColor Green
    exit 0
}

if (-not (Test-Path -LiteralPath $EnvPath -PathType Leaf)) {
    throw '.env exists but is not a regular file. Rename or remove it, then run START.bat again.'
}

$envFile = Get-Item -LiteralPath $EnvPath -ErrorAction Stop
if ($envFile.Length -le $MaxEnvBytes) {
    exit 0
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = Join-Path $Root ".env.oversized-$stamp.bak"

Move-Item -LiteralPath $EnvPath -Destination $backupPath -Force
Copy-Item -LiteralPath $ExamplePath -Destination $EnvPath

Write-Warning ("The local .env file was unexpectedly large ({0:N0} bytes) and could exhaust PowerShell memory. It was backed up to '{1}' and a clean .env was created from .env.example." -f $envFile.Length, $backupPath)
Write-Host 'The launcher will regenerate required local secrets automatically.' -ForegroundColor Yellow
