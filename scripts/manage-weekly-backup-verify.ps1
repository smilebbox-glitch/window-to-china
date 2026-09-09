param(
  [ValidateSet('menu','install','remove','status','run')]
  [string]$Action = 'menu'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$TaskName = 'MGC VM Weekly Backup Restoreability'
$WeeklyDay = if ($env:MGC_VM_WEEKLY_VERIFY_DAY) { $env:MGC_VM_WEEKLY_VERIFY_DAY } else { 'Sunday' }
$WeeklyTime = if ($env:MGC_VM_WEEKLY_VERIFY_TIME) { $env:MGC_VM_WEEKLY_VERIFY_TIME } else { '03:30' }
$AllowedDays = @('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')
if ($AllowedDays -notcontains $WeeklyDay) { throw '[NO-GO] MGC_VM_WEEKLY_VERIFY_DAY must be Monday..Sunday on Windows.' }
if ($WeeklyTime -notmatch '^([01]\d|2[0-3]):[0-5]\d$') { throw '[NO-GO] MGC_VM_WEEKLY_VERIFY_TIME must use HH:MM.' }

function Assert-DockerAccess {
  docker info *> $null
  if ($LASTEXITCODE -ne 0) { throw '[NO-GO] Current Windows account cannot access Docker.' }
}

function Install-Schedule {
  Assert-DockerAccess
  $User = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  $At = [datetime]::ParseExact($WeeklyTime, 'HH:mm', [Globalization.CultureInfo]::InvariantCulture)
  $PsExe = (Get-Command powershell.exe).Source
  $VerifyScript = Join-Path $Root 'scripts\verify-backup-both-vm.ps1'
  $TaskAction = New-ScheduledTaskAction -Execute $PsExe -Argument ('-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $VerifyScript) -WorkingDirectory $Root
  $Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $WeeklyDay -At $At
  $Principal = New-ScheduledTaskPrincipal -UserId $User -LogonType Interactive -RunLevel Limited
  $Settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)
  $Task = New-ScheduledTask -Action $TaskAction -Trigger $Trigger -Principal $Principal -Settings $Settings -Description 'Non-destructive restore drill for the latest dual-service VM backup. No pilot database is modified.'
  Register-ScheduledTask -TaskName $TaskName -InputObject $Task -Force | Out-Null
  Write-Host "[GO] Weekly backup restoreability task installed for $User: $WeeklyDay at $WeeklyTime local server time."
  Write-Host '[GO] StartWhenAvailable is enabled. No account password is stored by this script.'
}

function Remove-Schedule {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host '[GO] Weekly backup verification task removed. Existing backup/evidence files were preserved.'
}

function Show-Status {
  $Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if (-not $Task) { Write-Host '[WARN] Weekly backup verification task is not installed.'; return }
  $Info = Get-ScheduledTaskInfo -TaskName $TaskName
  $Task | Select-Object TaskName,State | Format-Table -AutoSize
  $Info | Select-Object LastRunTime,LastTaskResult,NextRunTime | Format-List
}

function Run-Now {
  Assert-DockerAccess
  & (Join-Path $Root 'scripts\verify-backup-both-vm.ps1')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

function Menu {
  while ($true) {
    Write-Host '======================================================'
    Write-Host ' MGC WEEKLY BACKUP RESTOREABILITY'
    Write-Host '======================================================'
    Write-Host '  1. RUN NOW'
    Write-Host '  2. INSTALL WEEKLY SCHEDULE'
    Write-Host '  3. SCHEDULE STATUS'
    Write-Host '  4. REMOVE SCHEDULE'
    Write-Host '  Q. BACK'
    $Choice = Read-Host 'Select'
    switch ($Choice.ToUpperInvariant()) {
      '1' { Run-Now }
      '2' { Install-Schedule }
      '3' { Show-Status }
      '4' { Remove-Schedule }
      'Q' { return }
      default { Write-Host 'Unknown selection.' }
    }
    Write-Host ''
  }
}

switch ($Action) {
  'install' { Install-Schedule }
  'remove' { Remove-Schedule }
  'status' { Show-Status }
  'run' { Run-Now }
  'menu' { Menu }
}
