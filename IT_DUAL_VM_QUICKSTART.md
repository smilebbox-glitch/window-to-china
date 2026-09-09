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

The shared launcher looks for `mgc-languages` next to `window-to-china`. A custom location can be supplied through `MGC_LANGUAGES_PATH`.

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
- Restarting containers does not delete the named volumes.

## Health checks

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

## Stop without deleting pilot data

Okno v Kitai:

```bash
cd /opt/mgc/window-to-china
docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml down
```

MGC Languages:

```bash
cd /opt/mgc/mgc-languages
docker compose --env-file .env.vm -f docker-compose.lan.yml -f docker-compose.vm.yml down
```

Do not add `-v` when normal pilot data must be retained.

## Later GPU migration

The temporary VM profile is intentionally separated from the future AI/GPU deployment. When the dedicated GPU PC/server is available, the core services and their data contracts can remain; the AI endpoint/model configuration can be connected through the normal deployment profiles rather than rewriting the applications.
