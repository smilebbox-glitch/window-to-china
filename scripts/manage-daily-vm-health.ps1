param(
    [ValidateSet('Menu','Install','Remove','Status','Run')]
    [string]$Action = 'Menu',
    [string]$DailyTime = $(if ($env:MGC_VM_DAILY_TIME) { $env:MGC_VM_DAILY_TIME } else { '02:15' })
)

$ErrorActionPreference = 'Stop'
$TaskName = 'MGC Dual VM Daily Health'
$Root = Split-Path -Parent $PSScriptRoot
$DailyScript = Join-Path $PSScriptRoot 'daily-vm-health.ps1'

function Get-TriggerTime {
    try {
        return [DateTime]::ParseExact($DailyTime, 'HH:mm', [Globalization.CultureInfo]::InvariantCulture)
    } catch {
        throw 'DailyTime must use HH:mm 24-hour format, for example 02:15.'
    }
}

function Install-DailyHealth {
    if (-not (Get-Command Register-ScheduledTask -ErrorAction SilentlyContinue)) {
        throw 'Windows ScheduledTasks module is required.'
    }
    if (-not (Test-Path -LiteralPath $DailyScript -PathType Leaf)) { throw "Missing $DailyScript" }

    $triggerTime = Get-TriggerTime
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $arguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $DailyScript
    $taskAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments -WorkingDirectory $Root
    $trigger = New-ScheduledTaskTrigger -Daily -At $triggerTime
    $principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1)

    Register-ScheduledTask -TaskName $TaskName -Action $taskAction -Trigger $trigger -Principal $principal -Settings $settings -Description 'Daily verified backup plus GO/WARN/NO-GO report for Okno v Kitai and MGC Languages.' -Force | Out-Null
    Write-Host "[GO] Daily VM health task installed for $identity at $DailyTime local server time."
    Write-Host '[WARN] Windows test profile uses the current interactive account. Keep that account signed in while Docker Desktop is the container runtime.'
    Show-DailyHealthStatus
}

function Remove-DailyHealth {
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host '[GO] Daily VM health task removed. Existing backups/reports/logs were preserved.'
    } else {
        Write-Host '[GO] Daily VM health task is not installed.'
    }
}

function Show-DailyHealthStatus {
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if (-not $task) {
        Write-Host '[WARN] Daily VM health task is not installed.'
        return
    }
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
    Write-Host ('Task:        {0}' -f $TaskName)
    Write-Host ('State:       {0}' -f $task.State)
    Write-Host ('Last run:    {0}' -f $info.LastRunTime)
    Write-Host ('Last result: {0}' -f $info.LastTaskResult)
    Write-Host ('Next run:    {0}' -f $info.NextRunTime)
}

function Run-DailyHealth {
    Write-Host '[GO] Running daily VM health check now.'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $DailyScript
    if ($LASTEXITCODE -ne 0) { throw "Daily VM health check returned code $LASTEXITCODE." }
}

function Show-Menu {
    while ($true) {
        Write-Host ''
        Write-Host '======================================================'
        Write-Host ' MGC DAILY VM HEALTH'
        Write-Host '======================================================'
        Write-Host '  1. RUN NOW'
        Write-Host '  2. INSTALL DAILY SCHEDULE'
        Write-Host '  3. SCHEDULE STATUS'
        Write-Host '  4. REMOVE SCHEDULE'
        Write-Host '  Q. BACK'
        $choice = Read-Host 'Select'
        switch ($choice.ToUpperInvariant()) {
            '1' { Run-DailyHealth }
            '2' { Install-DailyHealth }
            '3' { Show-DailyHealthStatus }
            '4' { Remove-DailyHealth }
            'Q' { return }
            default { Write-Host 'Unknown selection.' }
        }
    }
}

switch ($Action) {
    'Install' { Install-DailyHealth }
    'Remove' { Remove-DailyHealth }
    'Status' { Show-DailyHealthStatus }
    'Run' { Run-DailyHealth }
    'Menu' { Show-Menu }
}
