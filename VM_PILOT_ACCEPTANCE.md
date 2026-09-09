# VM pilot acceptance — final GO/NO-GO check

Use this check after the temporary CPU-only VM has been installed, after firewall configuration, after an update, and before inviting pilot users.

## Windows

1. Configure the corporate subnet once with `CONFIGURE_VM_FIREWALL.bat` as Administrator.
2. Start both services with `START_BOTH_VM.bat`.
3. Run `ACCEPT_BOTH_VM.bat`.

The acceptance command must finish with:

```text
[GO] VM PILOT ACCEPTANCE PASSED.
```

For the lighter operational view after acceptance, use:

```text
READINESS_BOTH_VM.bat
```

It verifies live service status and confirms that the current repository revisions and corporate CIDR still match the latest accepted `GO` receipt.

## Linux

After the firewall has been configured with `sudo ./scripts/configure-vm-firewall.sh` and the services are running:

```bash
cd /opt/mgc/window-to-china
sudo ./scripts/accept-both-vm.sh
```

For the later read-only readiness/drift check:

```bash
./scripts/readiness-both-vm.sh
```

The acceptance command checks four independent layers:

1. **Host firewall boundary** — only the explicitly configured private corporate CIDR may reach TCP 3000 and 8080.
2. **Runtime readiness and ingress isolation** — both services are healthy; the Okno scheduler stays internal; only the hardened MGC nginx edge is published.
3. **CPU-only / no-AI contract** — Okno external generative RAG settings are empty and MGC server-side TTS/cache are disabled.
4. **Acceptance evidence** — a timestamped, SHA-256-protected receipt records exactly which revisions passed the gate.

Any failed layer returns `[NO-GO]` and a non-zero exit code. Do not bypass a failed acceptance check by opening additional Docker/application/database ports or by weakening the firewall rule.

The acceptance command does not print `.env.vm` files or secret values. It only verifies the expected security/runtime state.

## Acceptance evidence receipt

A successful run writes a new timestamped folder under the sibling `vm-acceptance` directory by default:

```text
MGC/
  vm-acceptance/
    20260909T123000Z/
      acceptance.json
      checksums.sha256
```

`acceptance.json` contains only operational evidence:

- UTC acceptance time;
- `GO` result and the `dual-vm-cpu-only-no-ai` profile;
- exact Git commit SHA for Okno v Kitai and MGC Languages;
- configured corporate allow-list CIDR;
- admitted ports 3000 and 8080;
- passed status for host firewall, readiness, ingress isolation and no-AI runtime checks.

It does **not** contain `.env.vm`, API keys, database passwords, scheduler/admin tokens or a dump of container environment variables. `checksums.sha256` protects the receipt against unnoticed modification.

To use an IT-controlled evidence location, set:

```text
MGC_VM_ACCEPTANCE_ROOT=<approved path>
```

Treat the receipt as internal infrastructure metadata because it includes the corporate CIDR and deployment revision identifiers.

## Acceptance drift / readiness report

`READINESS_BOTH_VM` is intentionally read-only. It combines:

- current `STATUS_BOTH_VM` readiness and Docker ingress-isolation result;
- current Git SHA of both repositories;
- SHA-256 validation of the newest acceptance receipt;
- comparison of current SHA/CIDR against the last accepted SHA/CIDR;
- the newest normal backup and checksum validation of its `manifest.json`.

If either repository revision changes after acceptance, or if the configured corporate CIDR changes, the report returns:

```text
[NO-GO] ACCEPTANCE STALE
```

and instructs IT to run `ACCEPT_BOTH_VM` again. This prevents an update from silently inheriting an older deployment approval.

A missing or older backup is shown as `[WARN]`, not as a false successful backup claim. Create a fresh `BACKUP_BOTH_VM` before risky maintenance or sustained pilot use.

A fully current state ends with:

```text
[GO] PILOT READINESS: CURRENT ACCEPTANCE / SERVICES READY.
```

## When to run acceptance again

Run the acceptance gate again after:

- VM or Docker firewall changes;
- Docker/host reboot if firewall persistence is in doubt;
- repository/application updates;
- restore operations;
- changes to VM networking or corporate subnet;
- any manual Docker Compose modification.

Each successful run creates a separate receipt, so IT can retain a simple deployment-admission history without storing application secrets.

`STATUS_BOTH_VM` is the fastest live service check. `READINESS_BOTH_VM` adds acceptance-drift and backup context. `ACCEPT_BOTH_VM` is the strongest deployment-admission gate because it validates the host firewall, the no-AI runtime contract and writes new acceptance evidence.
