#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const selfPath = 'scripts/secret-preflight.mjs';
const privateExtensions = new Set(['.key', '.pem', '.p12', '.pfx', '.jks', '.keystore']);
const forbiddenExactNames = new Set(['.env', '.env.corporate', '.env.pilot', '.npmrc.local']);
const allowedTemplateSuffixes = ['.example', '.sample', '.template'];

const tokenPatterns = [
  ['PEM private key', /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/u],
  ['GitHub token', /(?:ghp|gho|ghs|ghr)_[A-Za-z0-9]{30,}/u],
  ['GitHub fine-grained token', /github_pat_[A-Za-z0-9_]{40,}/u],
  ['OpenAI-style API key', /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/u],
  ['AWS access key', /AKIA[0-9A-Z]{16}/u],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/u],
  ['Slack token', /xox[baprs]-[0-9A-Za-z-]{20,}/u],
  ['npm access token', /npm_[A-Za-z0-9]{30,}/u],
];

const sensitiveEnvKeys = new Set([
  'OIDC_CLIENT_SECRET',
  'OAUTH2_PROXY_COOKIE_SECRET',
  'AUTH_PROXY_SECRET',
  'AUDIT_HMAC_KEY',
  'SCHEDULER_TOKEN',
  'USER_DATA_HMAC_KEY',
  'METRICS_TOKEN',
  'RAG_API_KEY',
  'ADMIN_API_TOKEN',
]);

const safeValue = (raw) => {
  const value = raw.trim().replace(/^['"]|['"]$/gu, '');
  if (!value) return true;
  const upper = value.toUpperCase();
  return (
    value.startsWith('${') ||
    (value.startsWith('<') && value.endsWith('>')) ||
    upper.includes('CHANGE_ME') ||
    upper.includes('CHANGE-ME') ||
    upper.includes('GENERATE_') ||
    upper.includes('EXAMPLE') ||
    upper.includes('PLACEHOLDER') ||
    value.startsWith('ci-') ||
    value.startsWith('test-')
  );
};

const output = execFileSync('git', ['ls-files', '-z'], { cwd: root });
const files = output.toString('utf8').split('\0').filter(Boolean);
const findings = [];

for (const relative of files) {
  const normalized = relative.replaceAll('\\', '/');
  const base = path.posix.basename(normalized);
  const ext = path.posix.extname(base).toLowerCase();

  if (privateExtensions.has(ext)) {
    findings.push(`${normalized}: tracked private-key/keystore file type (${ext})`);
  }
  if (forbiddenExactNames.has(base) && !allowedTemplateSuffixes.some((suffix) => base.endsWith(suffix))) {
    findings.push(`${normalized}: runtime secret file must not be tracked`);
  }

  if (normalized === selfPath) continue;
  const absolute = path.join(root, relative);
  let stat;
  try {
    stat = fs.statSync(absolute);
  } catch {
    continue;
  }
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024) continue;

  let text;
  try {
    text = fs.readFileSync(absolute, 'utf8');
  } catch {
    continue;
  }

  for (const [label, pattern] of tokenPatterns) {
    if (pattern.test(text)) findings.push(`${normalized}: possible ${label}`);
  }

  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]+)\s*=\s*(.+?)\s*$/u);
    if (!match || !sensitiveEnvKeys.has(match[1])) continue;
    if (!safeValue(match[2])) {
      findings.push(`${normalized}:${index + 1}: ${match[1]} appears to contain a literal secret`);
    }
  }
}

if (findings.length) {
  console.error('Tracked secret preflight failed. Remove/rotate any real secret before continuing.');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`OK: scanned ${files.length} tracked files; no forbidden secret material detected.`);
