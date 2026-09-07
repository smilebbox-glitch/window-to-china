# One-click launch in GitHub

## Live application

Open **Code → Codespaces → Create codespace on main**. GitHub creates the environment, starts Docker automatically, runs the existing `./start.sh` one-click launcher and opens forwarded port **3000** in the browser.

Direct launcher: https://codespaces.new/smilebbox-glitch/window-to-china?quickstart=1

Codespaces is a private development/demo environment. Production/internal corporate publication still requires the approved network, TLS/SSO and IT controls described in the deployment documentation.

## One-click build verification

Open **Actions → One-click verification → Run workflow**. This uses the same `./start.sh`, checks `/api/health` and `/api/ready`, prints status, then stops the temporary runner stack.
