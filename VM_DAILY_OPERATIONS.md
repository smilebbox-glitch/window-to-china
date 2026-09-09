# Daily VM operations — two services / no AI

This layer is for the temporary CPU-only test VM that runs **Okno v Kitai** and **MGC Languages** together.

It does not change either product version and does not enable AI/GPU features.

## What the daily check does

Each run:

1. prevents overlapping duplicate runs;
2. checks the age of the latest verified dual-service backup;
3. creates a new verified backup when the latest complete backup is at least **20 hours** old (configurable);
4. runs the existing `OPS REPORT` gate for runtime/readiness, disk capacity and backup freshness;
5. stores a timestamped log plus `latest.log`;
6. returns a non-zero exit code when backup or operational readiness is `NO-GO`.

The existing backup retention remains **14 days** by default. VM secrets are still excluded unless IT explicitly opts into the existing secret-backup override.

## Windows

Open:

```text
MGC_VM_CONTROL.bat
```

Choose:

```text
D. DAILY OPS
```

or run `DAILY_VM_HEALTH.bat` directly.

Available actions:

- **RUN NOW** — execute the daily backup/health path immediately;
- **INSTALL DAILY SCHEDULE** — register a Windows Scheduled Task;
- **SCHEDULE STATUS** — show last result and next run;
- **REMOVE SCHEDULE** — remove only the task; backups, reports and logs are preserved.

Default schedule: approximately **02:15 local server time** each day. Override before installation with:

```powershell
$env:MGC_VM_DAILY_TIME='03:30'
```

The temporary Windows profile registers the task under the current interactive account without storing a password. If Docker Desktop is used, keep that account signed in. For a future production Windows Server deployment with Docker running as a system service, IT can replace this temporary task policy with its standard service account policy.

## Linux

From the repository:

```bash
chmod +x scripts/daily-vm-health.sh scripts/manage-daily-vm-health.sh
sudo scripts/manage-daily-vm-health.sh
```

Or choose `D. DAILY OPS` in:

```bash
scripts/vm-control.sh
```

The Linux installer creates:

```text
/etc/systemd/system/mgc-vm-daily-health.service
/etc/systemd/system/mgc-vm-daily-health.timer
```

The timer is persistent, so a missed run is started after the VM returns online. A small randomized delay prevents all maintenance jobs from starting at the exact same second.

Default schedule: **02:15 local server time**. Override before installation with:

```bash
export MGC_VM_DAILY_TIME=03:30
sudo -E scripts/manage-daily-vm-health.sh install
```

The installer verifies that the scheduled user can access Docker before enabling the timer.

## Default data locations

With the recommended sibling-folder deployment:

```text
MGC/
  window-to-china/
  mgc-languages/
  vm-backups/
  vm-reports/
  vm-daily-logs/
```

Useful files:

```text
vm-daily-logs/latest.log
vm-reports/<UTC timestamp>/operations.json
vm-backups/<UTC timestamp>/manifest.json
```

## Operational thresholds

Defaults:

```text
MGC_VM_DAILY_BACKUP_AFTER_HOURS=20
MGC_VM_BACKUP_MAX_AGE_HOURS=24
MGC_VM_DISK_WARN_GB=10
MGC_VM_DISK_NO_GO_GB=5
```

Interpretation:

- `GO` — services ready, acceptance current, capacity acceptable, verified backup current;
- `WARN` — services can continue, but maintenance attention is recommended;
- `NO-GO` — backup/readiness/capacity condition requires IT action.

Do not expose the temporary VM profile to the public internet. Keep ports **3000** and **8080** restricted to the required corporate subnet using the existing firewall controls.
