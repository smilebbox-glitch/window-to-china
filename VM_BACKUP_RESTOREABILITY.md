# VM backup restoreability verification

This is a **non-destructive** verification layer for the temporary two-service CPU-only/no-AI VM pilot.

A successful backup is not treated as fully trusted only because files exist or checksums match. The restoreability drill proves that the latest backup can actually be opened/restored without touching the live pilot databases.

## What the drill does

1. Finds the newest timestamped backup under `vm-backups`.
2. Verifies the complete backup bundle with `checksums.sha256`.
3. Opens the Okno v Kitai SQLite backup **read-only** inside an isolated container and runs `PRAGMA integrity_check`.
4. Starts a disposable `postgres:16.4-alpine` container with **no network and no published ports**.
5. Restores `mgc_languages.dump` into that disposable PostgreSQL instance with `--no-owner --no-privileges`.
6. Confirms that public tables exist and records the restored Alembic head when available.
7. Deletes the disposable PostgreSQL container.
8. Writes timestamped verification evidence with SHA-256 under `vm-backup-verification`.

The live Okno SQLite database, the live MGC Languages PostgreSQL database, Docker data volumes and `.env.vm` files are not modified by this operation.

## Manual Windows verification

Double-click:

```text
VERIFY_BACKUP_BOTH_VM.bat
```

Or use `MGC_VM_CONTROL.bat` → `V. VERIFY BACKUP`.

## Manual Linux verification

```bash
cd /opt/mgc/window-to-china
chmod +x scripts/verify-backup-both-vm.sh
./scripts/verify-backup-both-vm.sh
```

Or use `scripts/vm-control.sh` → `V. VERIFY BACKUP`.

## Weekly verification

Recommended default: **once per week**, separate from the daily backup/health job.

Linux defaults to Sunday at approximately 03:30 local server time:

```bash
sudo ./scripts/manage-weekly-backup-verify.sh install
sudo ./scripts/manage-weekly-backup-verify.sh status
```

Optional overrides:

```bash
export MGC_VM_WEEKLY_VERIFY_DAY=Sun
export MGC_VM_WEEKLY_VERIFY_TIME=03:30
```

Windows:

```text
WEEKLY_BACKUP_VERIFY.bat
```

The Windows scheduler uses the current interactive test account and does not store an account password in repository files. The scheduled account must be able to access Docker.

## Evidence

Default directory:

```text
../vm-backup-verification/<UTC timestamp>/
```

Contains:

- `verification.json`
- `verification.txt`
- `checksums.sha256`

A successful verification ends with:

```text
[GO] BACKUP RESTOREABILITY: VERIFIED WITHOUT MODIFYING PILOT DATABASES.
```

Any `[NO-GO]` means IT should not assume that the latest backup is recoverable until the cause is resolved and a new verification passes.
