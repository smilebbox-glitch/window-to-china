function Get-EnvFileValue {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Key
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return '' }

    $prefix = "$Key="
    $value = ''
    $reader = New-Object System.IO.StreamReader($Path, [System.Text.Encoding]::UTF8, $true)
    try {
        while (($line = $reader.ReadLine()) -ne $null) {
            if ($line.StartsWith($prefix, [System.StringComparison]::Ordinal)) {
                $value = $line.Substring($prefix.Length)
            }
        }
    } finally {
        $reader.Dispose()
    }
    return $value
}

function Set-EnvFileValue {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Key,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Value
    )

    $directory = Split-Path -Parent $Path
    if (-not $directory) { $directory = (Get-Location).Path }
    $tempPath = Join-Path $directory ('.env.tmp-' + $PID + '-' + [Guid]::NewGuid().ToString('N'))
    $prefix = "$Key="
    $found = $false
    $encoding = New-Object System.Text.UTF8Encoding($false)
    $writer = New-Object System.IO.StreamWriter($tempPath, $false, $encoding)

    try {
        if (Test-Path -LiteralPath $Path -PathType Leaf) {
            $reader = New-Object System.IO.StreamReader($Path, [System.Text.Encoding]::UTF8, $true)
            try {
                while (($line = $reader.ReadLine()) -ne $null) {
                    if ($line.StartsWith($prefix, [System.StringComparison]::Ordinal)) {
                        $writer.WriteLine("$Key=$Value")
                        $found = $true
                    } else {
                        $writer.WriteLine($line)
                    }
                }
            } finally {
                $reader.Dispose()
            }
        }

        if (-not $found) {
            $writer.WriteLine("$Key=$Value")
        }
    } finally {
        $writer.Dispose()
    }

    try {
        Move-Item -LiteralPath $tempPath -Destination $Path -Force
    } finally {
        if (Test-Path -LiteralPath $tempPath) {
            Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
        }
    }
}
