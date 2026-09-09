# Security Policy

`Окно в Китай` is an internal corporate pilot. Security-sensitive deployment must use the hardened corporate HTTPS + SSO profile or the restricted temporary VM profile; the temporary HTTP VM profile must never be exposed directly to the public Internet.

## Reporting

Do not publish credentials, tokens, private/internal URLs, employee data, partner-confidential data or vulnerability details in public issues, discussions or pull-request comments. Use the repository owner's approved private/corporate communication channel for security-sensitive findings.

## Secrets and confidential data

- Never commit `.env` files, runtime credentials, API tokens, private keys or private certificates.
- Keep examples free of real secrets and internal infrastructure details.
- Runtime secrets must come from the target environment or an approved secret manager.
- Do not commit employee records, production exports, internal network maps or confidential partner documents.
- While the repository is public, treat every tracked file and Git history object as externally readable.

## Required security gates

Security-sensitive changes must preserve and pass:

- tracked-secret/private-key preflight;
- production dependency audit;
- CodeQL;
- server/mobile HTTPS security gate;
- repository-integrity policy;
- applicable Docker/VM runtime and acceptance checks.

Authentication, authorization, cookies, CORS, HTTPS/SSO boundary, admin APIs, deployment profiles, firewall logic, workflow permissions and published ports require explicit security review in the pull request.

## Main-branch integrity

Changes should reach `main` through pull requests with green required checks. Repository-integrity detects unsafe workflow privilege changes and, once the repository is private, alarms on a `main` commit that is not associated with a merged pull request. Actual prevention of direct pushes requires a GitHub ruleset/branch protection and repository administration access.

## Repository visibility

Changing this repository from public to private is recommended before confidential company use. Private visibility is not a substitute for branch rules, least privilege, secret management, code review, firewalling or security scanning.
