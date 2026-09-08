# TLS files for the corporate profile

Do not commit real certificates or private keys.

The corporate launcher expects, by default:

- `deploy/tls/tls.crt` — certificate/full chain for `CORPORATE_HOST`;
- `deploy/tls/tls.key` — matching private key.

The certificate must be trusted by employee devices. A merely self-signed certificate that is not enrolled in the corporate trust store is not sufficient for the final PWA/SSO rollout.

IT checklist:

1. Publish internal DNS for the hostname from `.env.corporate` (default template: `china.mgc.internal`).
2. Issue a TLS certificate whose SAN contains that hostname.
3. Place the certificate and key on the server with access limited to the deployment administrator.
4. Ensure employee Windows/iOS/Android devices trust the issuing corporate CA.
5. Do not send private keys through chat, Git, email, tickets, or screenshots.

`START_CORPORATE_HTTPS.bat` refuses to start the corporate profile when the certificate or key is missing.
