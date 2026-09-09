# Final IT operations report — dual VM pilot

This report is the read-only daily/maintenance view for the temporary two-service CPU-only / no-AI VM.

It does **not** restart containers, modify either database, restore data, change firewall rules or expose secrets.

## Run

### Windows

Double-click:

```text
OPS_REPORT_BOTH_VM.bat
```

Or open the shared console:

```text
MGC_VM_CONTROL.bat
```

and choose **O. OPS REPORT**.

### Linux

```bash
cd /opt/mgc/window-to-china
./scripts/ops-report-both-vm.sh
```

The shared Linux console also exposes **O. OPS REPORT** through `./scripts/vm-control.sh`.

## What is checked

The report combines the existing runtime/readiness controls with host-capacity and backup-freshness checks:

- both services are healthy and ready;
- Docker ingress isolation still matches the accepted temporary VM contract;
- the latest acceptance receipt is still current for both Git revisions and the approved corporate CIDR;
- free disk space on the report filesystem;
- latest timestamped dual-service backup exists;
- the latest backup SHA-256 bundle is valid;
- age of the latest verified backup;
- current Git commit SHA for `window-to-china` and `mgc-languages`.

No `.env.vm`, OIDC secret, API key, database password or container environment dump is written to the report.

## Default thresholds

| Check | Default | Result |
| --- | ---: | --- |
| Free disk >= 10 GiB | 10 GiB | GO |
| Free disk >= 5 GiB but < 10 GiB | warning band | WARN |
| Free disk < 5 GiB | 5 GiB | NO-GO |
| Latest verified backup age <= 24 h | 24 h | GO |
| Latest verified backup age > 24 h | 24 h | WARN |
| Backup checksum invalid | — | NO-GO |
| Runtime/readiness/acceptance fails | — | NO-GO |

The thresholds can be overridden for a specific server process with:

```text
MGC_VM_DISK_WARN_GB
MGC_VM_DISK_NO_GO_GB
MGC_VM_BACKUP_MAX_AGE_HOURS
```

The NO-GO disk threshold must always be lower than the warning threshold.

## Output

Default report directory:

```text
../vm-reports/<UTC timestamp>/
```

Override with `MGC_VM_REPORT_ROOT` if IT has a dedicated operations/evidence filesystem.

Each report directory contains:

```text
operations.json
readiness.txt
checksums.sha256
```

`checksums.sha256` covers the report and readiness evidence and is verified immediately after generation.

## Meaning of the result

### GO

Services are ready, the accepted deployment identity is current, disk capacity is above the warning threshold and the latest verified backup is within the freshness window.

### WARN

The services can continue running, but IT maintenance is recommended. Typical causes are a backup older than the configured freshness window or disk space entering the warning band.

Recommended action: create `BACKUP_BOTH_VM` and/or free/extend disk capacity, then run the report again.

### NO-GO

Do not admit new pilot users or perform risky maintenance until the cause is resolved. Typical causes:

- runtime/readiness failure;
- stale acceptance after repository or CIDR change;
- critically low disk capacity;
- damaged/incomplete latest backup evidence.

After correction, run `ACCEPT_BOTH_VM` again when deployment identity changed, create a fresh backup when appropriate, and regenerate the operations report.

## Backup retention

The existing `BACKUP_BOTH_VM` operation already rotates normal timestamped backups using `MGC_VM_BACKUP_RETENTION_DAYS` (default **14 days**). The report does not delete backups; it remains read-only.

Before risky updates or restore operations, use the existing verified backup workflow regardless of the age shown by the daily report.
