# IT quick start — both MGC pilot services on one VM (no AI/GPU)

This is a temporary internal test deployment for running both approved pilot services on one CPU-only virtual machine before the dedicated GPU host is available.

## VM sizing

Recommended starting point:

- 4 vCPU
- 8 GB RAM
- 30–40 GB free disk
- Docker Engine / Docker Desktop with Docker Compose v2
- Git
- no GPU required

For a more comfortable build/update cycle, 8 vCPU and 16 GB RAM are preferable but not required for the functional pilot.

## Services

| Service | Repository folder | Port | AI mode |
| --- | --- | ---: | --- |
| Okno v Kitai | `window-to-china` | 3000 | generative RAG/LLM disabled |
| MGC Languages | `mgc-languages` | 8080 | server-side TTS/AI-heavy layer disabled |

The two Docker stacks use separate projects/networks/volumes and can run concurrently on the same VM.

## Folder layout

Keep the repositories as sibling folders:

```text
MGC/
  window-to-china/
  mgc-languages/
```

The shared launchers look for `mgc-languages` next to `window-to-china`. A custom location can be supplied through `MGC_LANGUAGES_PATH`.

## Linux VM — first installation and one-command start

```bash
sudo mkdir -p /opt/mgc
sudo chown "$USER":"$USER" /opt/mgc
cd /opt/mgc

git clone https://github.com/smilebbox-glitch/window-to-china.git
git clone https://github.com/smilebbox-glitch/mgc-languages.git

cd /opt/mgc/window-to-china
chmod +x scripts/start-vm.sh scripts/start-both-vm.sh
chmod +x ../mgc-languages/scripts/start-vm.sh
./scripts/start-both-vm.sh
```

The shared launcher starts Okno v Kitai first, waits for its health check, then starts MGC Languages and waits for its readiness check.

## Windows VM — first installation and one-click start

Clone both repositories into sibling folders, for example:

```text
C:\MGC\window-to-china
C:\MGC\mgc-languages
```

Then double-click:

```text
C:\MGC\window-to-china\START_BOTH_VM.bat
```

This calls the existing VM launcher in each repository. Each service creates its own `.env.vm`, generates local secrets, builds its Docker stack and waits for readiness.

## Daily IT operations

Windows operators use the following files in `window-to-china`:

```text
START_BOTH_VM.bat
STATUS_BOTH_VM.bat
BACKUP_BOTH_VM.bat
RESTORE_BOTH_VM.bat
STOP_BOTH_VM.bat
```

Linux equivalents:

```bash
./scripts/start-both-vm.sh
./scripts/status-both-vm.sh
./scripts/backup-both-vm.sh
./scripts/restore-both-vm.sh
./scripts/stop-both-vm.sh
```

`STATUS_BOTH_VM` checks both Docker stacks, container health and the real readiness endpoints. It returns non-zero if either service needs attention.

`STOP_BOTH_VM` performs `docker compose down` for both VM profiles without `-v`, so the Okno runtime volume and the MGC Languages PostgreSQL volume are preserved.

## Verified backup

`BACKUP_BOTH_VM` creates a timestamped folder under the sibling `vm-backups` directory by default:

```text
MGC/
  vm-backups/
    20260909T120000Z/
      okno.sqlite
      mgc_languages.dump
      runtime-config.json        # when present
      okno-audit/                # when present
      manifest.json
      checksums.sha256
```

The backup is created while the services remain online:

- Okno SQLite uses the application's `VACUUM INTO` backup path and then runs `PRAGMA integrity_check` before the file is copied to the host.
- MGC Languages PostgreSQL uses `pg_dump -Fc` and validates the dump with `pg_restore --list` before copying it to the host.
- SHA-256 checksums are generated and immediately re-verified.
- `manifest.json` records UTC timestamp, repository commits, profile and retention settings.

Default retention is 14 days. Override it when required:

```text
MGC_VM_BACKUP_RETENTION_DAYS=30
```

A different backup destination can be supplied with:

```text
MGC_VM_BACKUP_ROOT=<path>
```

VM `.env.vm` files contain credentials and signing secrets and are **not included by default**. For a controlled disaster-recovery export only, explicitly set:

```text
MGC_VM_BACKUP_INCLUDE_SECRETS=YES
```

If secrets are included, the resulting backup must be treated as confidential infrastructure material and stored only in an approved protected location.

## Verified restore / disaster recovery

Restore is a maintenance operation. Do not run it while users are actively working in either pilot service.

Before replacing any data, `RESTORE_BOTH_VM`:

1. verifies that `okno.sqlite`, `mgc_languages.dump`, `manifest.json` and `checksums.sha256` exist;
2. verifies all SHA-256 checksums;
3. checks that the manifest belongs to the `dual-vm-cpu-only-no-ai` profile;
4. creates a fresh **pre-restore safety backup** under `vm-backups/pre-restore/`;
5. validates the PostgreSQL dump with `pg_restore --list`;
6. requires explicit confirmation by typing `RESTORE`;
7. stops application writers, restores both databases, restarts the services and waits for both readiness endpoints.

The restore intentionally replaces **database data only**. The current VM `.env.vm` secrets, Okno runtime configuration and audit logs are preserved. This prevents an old backup from silently reverting current infrastructure credentials or operational configuration.

### Windows

To restore the newest timestamped backup in the default backup folder, double-click:

```text
RESTORE_BOTH_VM.bat
```

To restore a specific backup from Command Prompt:

```bat
RESTORE_BOTH_VM.bat "C:\MGC\vm-backups\20260909T120000Z"
```

The operator must type exactly:

```text
RESTORE
```

before destructive database replacement begins.

### Linux

Restore a specific bundle:

```bash
cd /opt/mgc/window-to-china
./scripts/restore-both-vm.sh /opt/mgc/vm-backups/20260909T120000Z
```

If no path is supplied, the launcher selects the newest timestamped backup from the configured backup root and still requires confirmation.

A custom backup root is supported through:

```text
MGC_VM_BACKUP_ROOT=<path>
```

If a restore step fails, the launcher prints the location of the automatically created pre-restore safety backup and attempts to bring both services back up for diagnostics.

After every restore, run `STATUS_BOTH_VM` and confirm both readiness endpoints before users reconnect.

## URLs

From the VM itself:

```text
http://127.0.0.1:3000   Okno v Kitai
http://127.0.0.1:8080   MGC Languages
```

From another PC on the approved corporate subnet:

```text
http://<VM-IP>:3000
http://<VM-IP>:8080
```

Allow inbound TCP 3000 and 8080 only from the required internal subnet. Do not expose this temporary test profile directly to the public Internet.

## Data and credentials

- Each service keeps its generated secrets in its local `.env.vm` file.
- `.env.vm` must not be committed to Git.
- Okno v Kitai keeps runtime data in its Docker volume.
- MGC Languages keeps PostgreSQL data in its Docker volume.
- Restarting or normally stopping containers does not delete the named volumes.

## Manual health checks

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
curl -fsS http://127.0.0.1:8080/health/live
curl -fsS http://127.0.0.1:8080/health/ready
```

All four commands must return successfully before users are invited to the pilot.

## Updating

Update both repositories, then run the shared launcher again:

```bash
cd /opt/mgc/window-to-china
git pull --ff-only origin main
cd ../mgc-languages
git pull --ff-only origin main
cd ../window-to-china
./scripts/start-both-vm.sh
```

Recommended update sequence for a pilot VM:

1. Run `BACKUP_BOTH_VM`.
2. Pull both repositories.
3. Run `START_BOTH_VM`.
4. Run `STATUS_BOTH_VM`.

## Stop without deleting pilot data

Preferred:

```bash
cd /opt/mgc/window-to-china
./scripts/stop-both-vm.sh
```

The script stops MGC Languages first and Okno v Kitai second and does not delete Docker volumes.

## Later GPU migration

The temporary VM profile is intentionally separated from the future AI/GPU deployment. When the dedicated GPU PC/server is available, the core services and their data contracts can remain; the AI endpoint/model configuration can be connected through the normal deployment profiles rather than rewriting the applications.
