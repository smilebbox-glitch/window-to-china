# Current VM Pilot Handoff — two MGC services

> **Важно для текущей передачи IT:** если разворачивается только **«Окно в Китай» / `window-to-china`**, начинайте с `IT_VM_HANDOFF.md` и `IT_VM_ACCEPTANCE_CHECKLIST.md`. Документ ниже относится только к отдельному сценарию, когда на одной VM одновременно запускаются **два сервиса**: `window-to-china` + `mgc-languages`.

**Status:** ready for controlled real-VM pilot validation.  
**Deployment profile:** one internal CPU-only VM, no GPU, generative AI disabled.  
**Services:** `window-to-china` + `mgc-languages`.

This document is the current operational decision for the temporary **dual-service** pilot. Detailed installation, firewall, backup, restore and update procedures remain in `IT_DUAL_VM_QUICKSTART.md`, `VM_PILOT_ACCEPTANCE.md` and `VM_DAILY_OPERATIONS.md`.

## Current operating decision

The infrastructure and safety contour is considered sufficient for the internal test pilot. Do **not** add speculative platform layers before the first real-VM/user cycle unless a blocker, security issue, data-loss risk or deployment defect is found.

The next engineering input must come from real operation: VM behavior, acceptance evidence, readiness, resource usage, incidents and user feedback.

## Approved go-live sequence

Do not admit pilot users until every mandatory gate below returns `[GO]`.

### Windows

First deployment or approved subnet change:

```text
CONFIGURE_VM_FIREWALL.bat
CHECK_VM_FIREWALL.bat
```

Normal pilot admission sequence:

```text
START_BOTH_VM.bat
ACCEPT_BOTH_VM.bat
READINESS_BOTH_VM.bat
DAILY_VM_HEALTH.bat
```

Operational shorthand:

```text
FIREWALL -> START -> ACCEPTANCE -> READINESS -> DAILY OPS
```

### Linux

First deployment or approved subnet change:

```bash
sudo ./scripts/configure-vm-firewall.sh <APPROVED_CORPORATE_CIDR>
sudo ./scripts/host-firewall-preflight.sh
```

Normal pilot admission sequence:

```bash
./scripts/start-both-vm.sh
./scripts/accept-both-vm.sh
./scripts/readiness-both-vm.sh
./scripts/daily-vm-health.sh
```

## Admission criteria

Pilot users may be invited only when:

- host firewall accepts only the IT-approved corporate CIDR for TCP `3000` and `8080`;
- both Docker stacks are running and healthy;
- Okno v Kitai health/readiness passes;
- MGC Languages live/readiness passes through its nginx ingress;
- the temporary no-AI contract is active;
- the acceptance receipt is current for the exact Git commits and corporate CIDR;
- `READINESS_BOTH_VM` returns `[GO]`;
- a verified backup exists before sustained use or risky maintenance.

## Temporary pilot URLs

From the VM itself:

```text
http://127.0.0.1:3000   Okno v Kitai
http://127.0.0.1:8080   MGC Languages
```

From an approved corporate client:

```text
http://<VM-IP>:3000
http://<VM-IP>:8080
```

This temporary HTTP profile must not be exposed directly to the public Internet.

## Daily operating rule

Run `DAILY_VM_HEALTH` / `scripts/daily-vm-health.sh` on the VM. It checks the two-service operational state, produces the operations report and ensures the latest backup is usable. A latest backup that fails SHA-256 verification is treated as invalid and triggers creation of a fresh verified backup.

Operational evidence retention is bounded by default; backup retention remains controlled separately by the backup policy.

## Change policy during the pilot

Before real pilot feedback, changes should be limited to:

- blocker fixes;
- security hardening;
- deployment/VM compatibility fixes;
- data integrity, backup or restore fixes;
- test/acceptance corrections;
- clear user-facing defects confirmed during the pilot.

New feature layers should be prioritized only after actual user and IT feedback identifies a business or usability need.

## Verification boundary

GitHub CI/runtime-smoke demonstrates that the repository builds and the automated deployment contracts work in controlled runners. Final production-like confirmation still requires running the sequence above on the actual corporate VM because its firewall, network, Docker host, disk and local policy cannot be proven from GitHub alone.
