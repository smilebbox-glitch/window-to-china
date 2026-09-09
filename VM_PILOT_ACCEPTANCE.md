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

## Linux

After the firewall has been configured with `sudo ./scripts/configure-vm-firewall.sh` and the services are running:

```bash
cd /opt/mgc/window-to-china
sudo ./scripts/accept-both-vm.sh
```

The command checks three independent layers:

1. **Host firewall boundary** — only the explicitly configured private corporate CIDR may reach TCP 3000 and 8080.
2. **Runtime readiness and ingress isolation** — both services are healthy; the Okno scheduler stays internal; only the hardened MGC nginx edge is published.
3. **CPU-only / no-AI contract** — Okno external generative RAG settings are empty and MGC server-side TTS/cache are disabled.

Any failed layer returns `[NO-GO]` and a non-zero exit code. Do not bypass a failed acceptance check by opening additional Docker/application/database ports or by weakening the firewall rule.

The acceptance command does not print `.env.vm` files or secret values. It only verifies the expected security/runtime state.

## When to run again

Run the acceptance gate again after:

- VM or Docker firewall changes;
- Docker/host reboot if firewall persistence is in doubt;
- repository/application updates;
- restore operations;
- changes to VM networking or corporate subnet;
- any manual Docker Compose modification.

`STATUS_BOTH_VM` remains the lighter daily service check. `ACCEPT_BOTH_VM` is the stronger deployment-admission check that additionally validates the host firewall and the no-AI runtime contract.
