# Okno v Kitai — test VM deployment (CPU-only / no generative AI)

This profile is intended for a temporary internal VM before a GPU workstation/server is available.

## Recommended VM

- 4 vCPU if both MGC services share one VM
- 8 GB RAM if both services share one VM
- 30–40 GB free disk
- Docker Engine/Desktop with Docker Compose v2
- no GPU required

Okno v Kitai uses port **3000** by default. MGC Languages uses port 8080, so both can run on the same VM without a port conflict.

## AI behavior

`.env.vm` keeps `RAG_API_URL`, `RAG_API_KEY` and `RAG_MODEL` empty. The optional generative RAG/LLM enhancement is therefore disabled. `/api/analyze` continues to use the built-in evidence-based analysis and remains functional.

## Linux VM

```bash
chmod +x scripts/start-vm.sh
./scripts/start-vm.sh
```

The launcher creates `.env.vm` on first start, generates local secrets, validates Compose, builds the image, starts the web service + scheduler and waits for the health check.

## Windows VM

Double-click:

```text
START_VM.bat
```

or run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-vm.ps1
```

## URLs

- local: `http://127.0.0.1:3000`
- LAN: `http://<VM-IP>:3000`

The VM/network firewall must allow TCP 3000 from the required corporate subnet if users connect from other PCs.

## Stop

```bash
docker compose --env-file .env.vm -f compose.yaml -f compose.vm.yaml down
```

Runtime data stays in the named Docker volume `okno-runtime-data`.

## Later GPU/AI migration

Do not change this VM profile. For the future AI host, configure the normal deployment with `RAG_API_URL`, `RAG_API_KEY` (if required) and `RAG_MODEL`. The core application can remain unchanged.
