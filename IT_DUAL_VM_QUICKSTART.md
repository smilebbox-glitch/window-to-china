# IT quick start — both MGC pilot services on one VM (no AI/GPU)

This is the temporary internal test deployment for running both approved pilot services on one CPU-only virtual machine before the dedicated GPU host is available.

## VM sizing

Recommended starting point:

- 4 vCPU
- 8 GB RAM
- 30–40 GB free disk
- Docker Engine / Docker Desktop with Docker Compose v2
- Git
- no GPU required

For a more comfortable build/update cycle, 8 vCPU and 16 GB RAM are preferable but not required for the functional pilot.

## Services and fixed ingress

| Service | Repository folder | Host port | AI mode |
| --- | --- | ---: | --- |
| Okno v Kitai | `window-to-china` | 3000 | generative RAG/LLM disabled |
| MGC Languages | `mgc-languages` | 8080 | server-side TTS/AI-heavy layer disabled |

The two Docker stacks use separate projects/networks/volumes and can run concurrently on the same VM.

The temporary VM has a **fail-closed host firewall boundary**. Only one IT-approved private corporate IPv4 CIDR may reach TCP `3000` and `8080`. The real shared launcher refuses to start either service when that CIDR or the required host firewall rules are missing or unsafe.

The local allow-list is stored in `.env.vm-host` and must never be committed:

```text
MGC_VM_ALLOWED_CIDR=<APPROVED_CORPORATE_CIDR>
```

Example format only:

```text
MGC_VM_ALLOWED_CIDR=10.20.30.0/24
```

Use the real network supplied by IT. Do not substitute `0.0.0.0/0`, `Any`, an Internet-facing range, or a guessed subnet.

Detailed firewall implementation and recovery notes are in `VM_HOST_FIREWALL.md`.

## Required folder layout

Keep the repositories as sibling folders:

```text
MGC/
  window-to-china/
  mgc-languages/
```

The shared launchers look for `mgc-languages` next to `window-to-china`. A custom location can be supplied through `MGC_LANGUAGES_PATH`.

## Linux VM — first installation

Clone both repositories first:

```bash
sudo mkdir -p /opt/mgc
sudo chown "$USER":"$USER" /opt/mgc
cd /opt/mgc

git clone https://github.com/smilebbox-glitch/window-to-china.git
git clone https://github.com/smilebbox-glitch/mgc-languages.git

cd /opt/mgc/window-to-china
chmod +x scripts/*.sh
chmod +x ../mgc-languages/scripts/start-vm.sh
```

### Mandatory Linux firewall setup

Before the first application start, replace the placeholder below with the **IT-approved corporate IPv4 CIDR**:

```bash
cd /opt/mgc/window-to-china
sudo ./scripts/configure-vm-firewall.sh <APPROVED_CORPORATE_CIDR>
sudo ./scripts/host-firewall-preflight.sh
```

Expected result:

```text
[GO] Linux Docker host firewall is fail-closed
```

The Linux profile filters Docker-published traffic through Docker's `DOCKER-USER` path. It creates an `MGC-VM-FILTER` chain that permits the approved CIDR to reach only TCP `3000`/`8080` and drops other sources for those ports. When systemd is available, setup also enables `mgc-vm-firewall.service` so the boundary is reapplied after reboot.

Only after firewall preflight passes, start both services:

```bash
./scripts/start-both-vm.sh
```

The shared launcher runs the firewall preflight **before either application is started**, then starts both stacks and performs the final readiness + ingress-isolation gate. `[GO]` is printed only after all gates pass.

## Windows VM — first installation

Clone both repositories into sibling folders, for example:

```text
C:\MGC\window-to-china
C:\MGC\mgc-languages
```

### Mandatory Windows firewall setup

Before the first application start:

1. Right-click `C:\MGC\window-to-china\CONFIGURE_VM_FIREWALL.bat`.
2. Choose **Run as administrator**.
3. Enter the IT-approved private corporate IPv4 CIDR.
4. Run `CHECK_VM_FIREWALL.bat` and require `[GO]`.
5. Only then run `START_BOTH_VM.bat`.

The setup creates only these two restricted Windows Defender Firewall ingress rules:

```text
MGC VM - TCP 3000 from corporate subnet
MGC VM - TCP 8080 from corporate subnet
```

They are restricted to the exact corporate CIDR and Domain/Private profiles. The preflight rejects a disabled firewall profile, an inbound-default-Allow baseline, a Public/Any exposure, or another broad enabled allow rule that explicitly exposes TCP `3000`/`8080`.

The normal start path is therefore:

```text
CONFIGURE_VM_FIREWALL.bat   # first deployment / subnet change; Administrator
CHECK_VM_FIREWALL.bat       # verify boundary
START_BOTH_VM.bat           # start only after [GO]
```

If the firewall contract is missing or invalid, `START_BOTH_VM.bat` intentionally returns `[NO-GO]` instead of weakening the host boundary.

## Temporary VM network boundary

Expected host exposure is exactly:

- **Okno v Kitai:** TCP `3000` from the hardened application container; scheduler has no published host port.
- **MGC Languages:** TCP `8080` from the hardened nginx gateway only; application container and PostgreSQL have no published host ports.
- **Source network:** only the configured `MGC_VM_ALLOWED_CIDR`.

`STATUS_BOTH_VM` validates the Docker ingress contract and service readiness. `START_BOTH_VM` additionally validates the host firewall before startup.

Do not open database/application/scheduler ports manually to troubleshoot. If a service cannot be reached, run the firewall check and `STATUS_BOTH_VM` instead of bypassing the isolation boundary.

This CPU-only VM profile uses internal **HTTP** for the temporary pilot. The production/corporate perimeter is a separate deployment profile: use the existing corporate HTTPS + SSO profile when wider corporate access is required. Do not treat the temporary HTTP profile as the final corporate security boundary.

## Daily IT operations

The simplest Windows entry point is:

```text
MGC_VM_CONTROL.bat
```

Menu order:

1. FIREWALL SETUP
2. FIREWALL CHECK
3. START
4. STATUS
5. BACKUP
6. DIAGNOSTICS
7. UPDATE
8. RESTORE
9. STOP

Linux equivalent:

```bash
./scripts/vm-control.sh
```

Direct Windows commands remain available:

```text
CONFIGURE_VM_FIREWALL.bat
CHECK_VM_FIREWALL.bat
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
sudo ./scripts/configure-vm-firewall.sh <APPROVED_CORPORATE_CIDR>
sudo ./scripts/host-firewall-preflight.sh
./scripts/start-both-vm.sh
./scripts/status-both-vm.sh
./scripts/backup-both-vm.sh
./scripts/diagnostics-both-vm.sh
./scripts/update-both-vm.sh
./scripts/restore-both-vm.sh
./scripts/stop-both-vm.sh
```

`STATUS_BOTH_VM` returns non-zero if either service is unhealthy or if an unexpected Docker ingress/security configuration is detected.

`STOP_BOTH_VM` performs `docker compose down` for both VM profiles **without `-v`**, so the Okno runtime volume and MGC Languages PostgreSQL volume are preserved.

## Secret-safe diagnostics

`DIAGNOSTICS_BOTH_VM` creates a timestamped bundle under the sibling `vm-diagnostics` directory. By default it contains host/Docker status, container status, resource usage, Git revisions and health/readiness responses.

It deliberately does **not** copy `.env.vm` or `.env.vm-host`, and it does not dump container environment variables. Application logs are excluded by default because they may contain operational or user-derived data.

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

Backup is created while services remain online:

- Okno SQLite uses the application's `VACUUM INTO` backup path and then runs `PRAGMA integrity_check` before the file is copied to the host.
- MGC Languages PostgreSQL uses `pg_dump -Fc` and validates the dump with `pg_restore --list` before copying it to the host.
- SHA-256 checksums are generated and immediately re-verified.
- `manifest.json` records UTC timestamp, repository commits, profile and retention settings.

Default retention is 14 days. Override when required:

```text
MGC_VM_BACKUP_RETENTION_DAYS=30
```

A different backup destination can be supplied with:

```text
MGC_VM_BACKUP_ROOT=<path>
```

VM `.env.vm` files contain credentials/signing secrets and are **not included by default**. For controlled disaster recovery only:

```text
MGC_VM_BACKUP_INCLUDE_SECRETS=YES
```

Any backup containing secrets must be treated as confidential infrastructure material and stored only in an approved protected location.

## Safe update

Preferred update method:

```text
UPDATE_BOTH_VM.bat
```

or on Linux:

```bash
./scripts/update-both-vm.sh
```

The updater is deliberately conservative:

1. verifies both repositories are on `main`;
2. refuses to overwrite local/untracked work;
3. verifies both repositories can fast-forward;
4. creates and verifies a full dual-service backup before changing either working tree;
5. uses only `git pull --ff-only origin main`;
6. rebuilds/recreates both CPU-only VM profiles;
7. runs the shared readiness and ingress-isolation check;
8. records old/new SHAs and the result in `update-result.txt` inside the pre-update backup folder.

The host firewall is persistent infrastructure and must remain `[GO]` before/after an update. If the subnet changes, rerun `CONFIGURE_VM_FIREWALL` with the newly approved CIDR before the next shared start.

If build/readiness fails, the updater leaves the verified pre-update backup intact and does not perform an automatic destructive rollback.

## Verified restore / disaster recovery

Restore is a maintenance operation. Do not run it while users are actively working in either pilot service.

Before replacing data, `RESTORE_BOTH_VM`:

1. verifies `okno.sqlite`, `mgc_languages.dump`, `manifest.json` and `checksums.sha256`;
2. verifies SHA-256 checksums;
3. checks that the manifest belongs to the `dual-vm-cpu-only-no-ai` profile;
4. creates a fresh **pre-restore safety backup** under `vm-backups/pre-restore/`;
5. validates the PostgreSQL dump with `pg_restore --list`;
6. requires explicit confirmation by typing `RESTORE`;
7. stops application writers, restores both databases, restarts services and waits for readiness.

Restore intentionally replaces **database data only**. Current VM secrets, host firewall allow-list, Okno runtime configuration and audit logs are preserved.

Windows — newest backup:

```text
RESTORE_BOTH_VM.bat
```

Specific Windows backup:

```bat
RESTORE_BOTH_VM.bat "C:\MGC\vm-backups\20260909T120000Z"
```

Linux:

```bash
cd /opt/mgc/window-to-china
./scripts/restore-both-vm.sh /opt/mgc/vm-backups/20260909T120000Z
```

After every restore, require:

```text
CHECK_VM_FIREWALL / host-firewall-preflight   -> [GO]
STATUS_BOTH_VM                                -> [GO]
```

before users reconnect.

## URLs

From the VM itself:

```text
http://127.0.0.1:3000   Okno v Kitai
http://127.0.0.1:8080   MGC Languages (nginx ingress)
```

From another PC **inside the approved corporate CIDR**:

```text
http://<VM-IP>:3000
http://<VM-IP>:8080
```

Do not expose this temporary test profile directly to the public Internet. Do not publish MGC application/PostgreSQL ports or the Okno scheduler port on the host.

## Data and credentials

- Each service keeps generated secrets in its local `.env.vm`.
- Host allow-list is kept in local `.env.vm-host`.
- Neither file may be committed to Git.
- Okno v Kitai keeps runtime data in its Docker volume.
- MGC Languages keeps PostgreSQL data in its Docker volume.
- Normal container restart/stop does not delete the named volumes.
- Docker stacks use `restart: unless-stopped`; host firewall persistence must therefore remain enabled so reboot cannot return applications without the network boundary.

## Manual verification

First verify host firewall:

### Windows

```text
CHECK_VM_FIREWALL.bat
```

### Linux

```bash
sudo ./scripts/host-firewall-preflight.sh
```

Then verify the four application endpoints:

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
curl -fsS http://127.0.0.1:8080/health/live
curl -fsS http://127.0.0.1:8080/health/ready
```

Finally run `STATUS_BOTH_VM`. Successful HTTP checks alone do not prove that the host firewall or Docker ingress isolation is correct.

## Manual update fallback

Use only when the shared updater is unavailable and only after `BACKUP_BOTH_VM`:

```bash
cd /opt/mgc/window-to-china
git pull --ff-only origin main
cd ../mgc-languages
git pull --ff-only origin main
cd ../window-to-china
sudo ./scripts/host-firewall-preflight.sh
./scripts/start-both-vm.sh
./scripts/status-both-vm.sh
```

Do not use forced reset as a routine update procedure.

## Stop without deleting pilot data

```bash
cd /opt/mgc/window-to-china
./scripts/stop-both-vm.sh
```

The script stops MGC Languages first and Okno v Kitai second and does not delete Docker volumes.

## Later GPU migration

The temporary VM profile is intentionally separated from the future AI/GPU deployment. When the dedicated GPU PC/server is available, the core services and data contracts can remain; AI endpoint/model configuration can be connected through the normal deployment profiles rather than rewriting the applications.
