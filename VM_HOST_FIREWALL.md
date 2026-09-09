# Temporary dual-service VM — host firewall boundary

This document applies to the CPU-only / no-AI pilot that runs **Okno v Kitai** and **MGC Languages** on one internal VM.

## Required network contract

Only one approved internal IPv4 subnet may reach the VM application ports:

- TCP `3000` — Okno v Kitai
- TCP `8080` — MGC Languages nginx gateway

The allow-list is stored locally in `.env.vm-host`:

```text
MGC_VM_ALLOWED_CIDR=10.20.30.0/24
```

Use the real corporate subnet. The preflight accepts only canonical RFC1918 or CGNAT IPv4 CIDRs and rejects public Internet ranges, `0.0.0.0/0`, non-canonical network addresses and the tracked placeholder.

`.env.vm-host` is ignored by Git and must not be committed.

## Fail-closed startup

`START_BOTH_VM` runs the host firewall preflight **before either application is started**. A real VM start is rejected when:

- `.env.vm-host` is missing or still contains the placeholder;
- the CIDR is public/unsafe;
- the required restricted firewall rules are missing;
- another broad Windows rule explicitly exposes TCP 3000/8080;
- the Linux Docker `DOCKER-USER` boundary is missing or can be bypassed before the MGC rule chain.

GitHub Actions uses a contract-only verification mode because hosted CI runners must not have their host firewall modified. That mode is selected only inside a GitHub Actions run; normal VM launches inspect the real host firewall.

## Windows VM

1. Clone both repositories as sibling folders.
2. Right-click `CONFIGURE_VM_FIREWALL.bat` and choose **Run as administrator**.
3. Enter the approved corporate CIDR, for example `10.20.30.0/24`.
4. The script creates two Windows Defender Firewall inbound rules:
   - `MGC VM - TCP 3000 from corporate subnet`
   - `MGC VM - TCP 8080 from corporate subnet`
5. Both rules are limited to the exact CIDR and to Domain/Private profiles. Public/Any profile exposure is rejected.
6. Run `CHECK_VM_FIREWALL.bat` or use **FIREWALL CHECK** in `MGC_VM_CONTROL.bat`.
7. Only after `[GO]`, run `START_BOTH_VM.bat`.

The setup command does not disable Windows Firewall and does not change a corporate firewall baseline. If a profile is disabled or its default inbound action is Allow, configuration stops with `[NO-GO]` and IT must correct the host baseline first.

If another enabled inbound allow rule explicitly opens TCP 3000 or 8080 broadly (`Any`, `0.0.0.0/0`, `Internet` or `LocalSubnet`), preflight fails. Narrow or remove that conflicting rule before starting the pilot.

## Linux VM

Docker-published ports can bypass assumptions based only on a host UFW rule set, so the pilot is filtered in Docker's `DOCKER-USER` path.

First-time setup:

```bash
cd /opt/mgc/window-to-china
chmod +x scripts/*.sh
sudo ./scripts/configure-vm-firewall.sh 10.20.30.0/24
```

The script:

1. validates the CIDR;
2. writes local `.env.vm-host` with mode 600;
3. creates/refreshes `MGC-VM-FILTER`;
4. inserts it as the **first** rule in `DOCKER-USER`;
5. returns approved CIDR traffic for TCP 3000/8080 to Docker processing;
6. drops all other sources for those two ports;
7. leaves unrelated Docker traffic unchanged;
8. installs `mgc-vm-firewall.service` when systemd is available so the Docker filter is re-applied after reboot.

Check it manually:

```bash
sudo ./scripts/host-firewall-preflight.sh
```

Then start the pilot:

```bash
./scripts/start-both-vm.sh
```

When the start is interactive, Linux preflight may request `sudo` access to inspect `iptables`. For unattended startup, IT should provide an approved non-interactive privilege mechanism or run the operator command under the appropriate service account/root context.

## What Linux preflight verifies

- Docker daemon is running.
- `DOCKER-USER` exists.
- `MGC-VM-FILTER` exists.
- the first `DOCKER-USER` rule jumps to `MGC-VM-FILTER`;
- the exact approved CIDR has the TCP 3000/8080 return rule;
- all other sources hit a DROP rule for TCP 3000/8080;
- the allow rule is evaluated before the DROP rule;
- no explicit ACCEPT rule for these pilot ports exists inside the MGC chain.

## Operator console

Windows `MGC_VM_CONTROL.bat` and Linux `./scripts/vm-control.sh` now expose firewall operations before the normal lifecycle actions:

1. FIREWALL SETUP
2. FIREWALL CHECK
3. START
4. STATUS
5. BACKUP
6. DIAGNOSTICS
7. UPDATE
8. RESTORE
9. STOP

## Important limitations

This firewall profile is for the temporary internal HTTP pilot. It is not a replacement for the existing corporate HTTPS + SSO deployment profile.

Do not:

- expose TCP 3000/8080 to the public Internet;
- add `0.0.0.0/0`/Any firewall rules;
- publish MGC PostgreSQL or application-internal ports;
- publish the Okno scheduler port;
- disable the host firewall to troubleshoot reachability.

If access fails, run the firewall preflight and `STATUS_BOTH_VM` instead of widening the network boundary.
