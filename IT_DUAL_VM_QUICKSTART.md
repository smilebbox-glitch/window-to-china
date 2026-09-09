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

## Temporary VM network boundary

This profile is deliberately limited to the internal pilot network. The expected host exposure is exactly:

- **Okno v Kitai:** TCP `3000` from the hardened application container; its scheduler has no published host port.
- **MGC Languages:** TCP `8080` from the hardened nginx gateway only; the application container and PostgreSQL have no published host ports.

`STATUS_BOTH_VM` validates these conditions at runtime in addition to checking service readiness. It also verifies the relevant container hardening controls such as read-only root filesystems, `no-new-privileges` and reduced Linux capabilities.

Do not open Docker database/application ports manually to make troubleshooting easier. If a service cannot be reached through the expected ingress above, diagnose the stack instead of bypassing the isolation boundary.

This CPU-only VM profile uses internal **HTTP** for the temporary pilot. The production/corporate perimeter is a separate deployment profile: use the existing corporate HTTPS + SSO profile when wider corporate access is required. Do not treat the temporary HTTP profile as the final corporate security boundary.

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

The shared launcher starts Okno v Kitai first, waits for its health check, then starts MGC Languages and waits for its readiness check. The first shared start also repairs executable bits for the Linux operator commands.

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

The simplest Windows entry point is:

```text
MGC_VM_CONTROL.bat
```

It opens one menu with Start, Status, Backup, Diagnostics, Update, Restore and Stop. On Linux the equivalent operations console is:

```bash
./scripts/vm-control.sh
```

The individual Windows commands remain available when IT wants to automate or run one action directly:

```text
START_BOTH_VM.bat
STATUS_BOTH_VM.bat
BACKUP_BOTH_VM.bat
DIAGNOSTICS_BOTH_VM.bat
UPDATE_BOTH_VM.bat
RESTORE_BOTH_VM.bat
STOP_BOTH_VM.bat
```

Linux equivalents:

```bash
./scripts/start-both-vm.sh
./scripts/status-both-vm.sh
./scripts/backup-both-vm.sh
./scripts/diagnostics-both-vm.sh
./scripts/update-both-vm.sh
./scripts/restore-both-vm.sh
./scripts/stop-both-vm.sh
```

`STATUS_BOTH_VM` checks both Docker stacks, container health, the real readiness endpoints and the expected ingress isolation. It returns non-zero if either service is unhealthy **or** if an unexpected host port/security configuration is detected.

Expected status result:

- Okno: only hardened app port `3000` is published; scheduler stays internal.
- MGC Languages: only hardened nginx port `8080` is published; app and PostgreSQL stay internal.

`STOP_BOTH_VM` performs `docker compose down` for both VM profiles without `-v`, so the Okno runtime volume and the MGC Languages PostgreSQL volume are preserved.

## Secret-safe diagnostics

`DIAGNOSTICS_BOTH_VM` creates a timestamped bundle under the sibling `vm-diagnostics` directory. By default it contains host/Docker status, container status, resource usage, Git revisions and health/readiness responses.

It deliberately does **not** copy `.env.vm` files or dump container environment variables. Application logs are also excluded by default because they may contain operational or user-derived data.

Only when IT explicitly needs recent application logs, set:

```text
MGC_VM_DIAGNOSTICS_INCLUDE_LOGS=YES
```

A custom diagnostics destination can be supplied through:

```text
MGC_VM_DIAGNOSTICS_ROOT=<path>
```

Treat a diagnostics bundle containing logs as internal operational data.

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

## Safe update

Preferred update method on Windows:

```text
UPDATE_BOTH_VM.bat
```

On Linux:

```bash
./scripts/update-both-vm.sh
```

The updater is deliberately conservative:

1. verifies that both repositories are on `main`;
2. refuses to overwrite local/untracked work;
3. fetches `origin/main` and verifies that both repositories can fast-forward;
4. creates and verifies a full dual-service backup **before** changing either working tree;
5. uses only `git pull --ff-only origin main` — never `reset --hard` or `git clean`;
6. rebuilds/recreates both CPU-only VM profiles;
7. runs the shared readiness **and ingress-isolation** check;
8. records old/new commit SHAs and the result in `update-result.txt` inside the pre-update backup folder.

If the new build/readiness fails, the updater leaves the verified pre-update backup intact and does not attempt an automatic destructive rollback. IT can diagnose first and use the controlled restore procedure if required.

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

If a restore step fails, the launcher prints the location of the automatically created pre-restore safety backup and attempts to bring both services back up for diagnostics.

After every restore, run `STATUS_BOTH_VM` and confirm both readiness endpoints **and ingress-isolation checks** before users reconnect.

## URLs

From the VM itself:

```text
http://127.0.0.1:3000   Okno v Kitai
http://127.0.0.1:8080   MGC Languages (nginx ingress)
```

From another PC on the approved corporate subnet:

```text
http://<VM-IP>:3000
http://<VM-IP>:8080
```

Allow inbound TCP 3000 and 8080 only from the required internal subnet. Do not expose this temporary test profile directly to the public Internet. Do not publish the MGC application/PostgreSQL ports or the Okno scheduler port on the host.

## Data and credentials

- Each service keeps its generated secrets in its local `.env.vm` file.
- `.env.vm` must not be committed to Git.
- Okno v Kitai keeps runtime data in its Docker volume.
- MGC Languages keeps PostgreSQL data in its Docker volume.
- Restarting or normally stopping containers does not delete the named volumes.
- Both Docker stacks use `restart: unless-stopped`, so after a normal VM reboot they can return automatically when Docker itself starts, unless an operator explicitly stopped the stacks.

## Manual health checks

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
curl -fsS http://127.0.0.1:8080/health/live
curl -fsS http://127.0.0.1:8080/health/ready
```

All four commands must return successfully before users are invited to the pilot. Then run `STATUS_BOTH_VM` once more; successful HTTP checks alone do not prove that no unexpected Docker port was published.

## Manual update fallback

Use this only when the shared updater is unavailable and only after running `BACKUP_BOTH_VM`:

```bash
cd /opt/mgc/window-to-china
git pull --ff-only origin main
cd ../mgc-languages
git pull --ff-only origin main
cd ../window-to-china
./scripts/start-both-vm.sh
./scripts/status-both-vm.sh
```

Do not use a forced reset as a routine update procedure.

## Stop without deleting pilot data

Preferred:

```bash
cd /opt/mgc/window-to-china
./scripts/stop-both-vm.sh
```

The script stops MGC Languages first and Okno v Kitai second and does not delete Docker volumes.

## Later GPU migration

The temporary VM profile is intentionally separated from the future AI/GPU deployment. When the dedicated GPU PC/server is available, the core services and their data contracts can remain; the AI endpoint/model configuration can be connected through the normal deployment profiles rather than rewriting the applications.
