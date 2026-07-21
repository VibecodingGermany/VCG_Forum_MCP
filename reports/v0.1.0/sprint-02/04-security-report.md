---
sprint: 02
title: Security review — @vibecoding/forum-mcp wrapper
author: security
date: 2026-07-21
verdict: APPROVED (with notes)
---

# Security review — VCG Forum MCP wrapper

## Summary
Read-only audit of the thin `@vibecoding/forum-mcp` wrapper (branch `feat/sprint-02-wrapper`):
`package.json`, `src/**`, `.npmignore`, `.gitignore`, lockfile. No Critical or High findings.
Secret hygiene, file permissions, command-injection posture, write-gating, and supply-chain
pinning are all implemented correctly. Two Medium/Low advisories and one transitive dependency
advisory noted below. **Verdict: APPROVED (with notes).**

## Findings by severity

### Critical / High
None.

### Medium
- **M1 — Transitive dependency advisory (supply chain).** `npm audit` reports 2 moderate
  vulnerabilities, both transitive under the pinned `@discourse/mcp@0.2.9`:
  `@hono/node-server <2.0.5` (GHSA-frvp-7c67-39w9, path traversal in `serve-static` via encoded
  backslash) pulled in by `@modelcontextprotocol/sdk`. **Not exploitable in this wrapper's
  usage:** the wrapper runs the MCP over **stdio** (`stdio: 'inherit'`), never the HTTP
  `serve-static` path, and the flaw is Windows-only. Our package pins upstream exactly, so we
  cannot `audit fix` without diverging from the vetted `@discourse/mcp` pin. Track upstream for
  a `@discourse/mcp` release that bumps the SDK; do not force-resolve locally.

### Low / Info
- **L1 — `serve` passthrough args are appended after the write flags** (`src/commands/serve.js:23`,
  `src/cli.js:45-55`). Extra args are pushed *after* `--read_only=false --allow_writes=true`, so a
  user could self-inject write flags via `-- --allow_writes=true` even without `--write`. This is
  **not a privilege escalation**: it is the same local user acting on their own behalf, and the
  forum still independently gates writes via `allow_user_api_key_scopes`. No shell is involved
  (array-arg spawn), so there is no injection. Advisory only — consider documenting that
  passthrough args are trusted, or (defense-in-depth) stripping write flags from passthrough when
  `--write` was not given.
- **L2 — Prompt-injection posture (docs, advisory for @scribe).** When writes are enabled, forum
  content the model reads can attempt to steer write actions performed under the user's key. The
  code default is already correct (read-only unless explicitly opted in). Recommend @scribe add a
  README warning that `--write` grants the assistant authority to post/edit as the user, and that
  writes should stay off unless needed. No code change required.

## Verified controls (pass)
- **Secret handling — PASS.** No code path reads or prints profile/key contents. `config.js`
  only ever touches the profile *path* and `chmod`; it never `readFile`s the profile. Every
  `console.log`/`console.error` across `src/**` surfaces only static text, the public SITE, the
  profile *path*, version, or command names — grep confirmed no key/token echo. `help.js` and
  `login.js` explicitly state the key is never printed.
- **File permissions — PASS.** `ensureConfigDir()` creates the dir `0700` and re-`chmod 0700`s to
  defeat umask (`config.js:27-37`); `lockDownProfileIfPresent()` `chmod 0600`s the profile after
  login (`config.js:42-53`, called at `login.js:32`). Best-effort try/catch for non-POSIX FS is
  reasonable.
- **Command injection — PASS.** Sole child-process API is `spawnSync(process.execPath, [binAbs,
  ...args], { stdio: 'inherit' })` (`discourse.js:44`) — args ARRAY, no `shell:true`, no
  `exec`/`execSync`, no string concatenation into a shell. Bin path resolved via `createRequire`
  from the pinned package, not user input. Passthrough args cannot break out of the arg vector.
- **Write posture — PASS.** Read-only by default; write flags added only when `--write` or
  `VCG_FORUM_MCP_ALLOW_WRITES === '1'` (`serve.js:18-21`). No always-on writes.
- **Supply chain — PASS.** `@discourse/mcp` pinned exactly to `0.2.9` (no caret) in
  `package.json:18`; lockfile confirms version `0.2.9` with sha512 integrity. Sole runtime dep.
  No `scripts`/`postinstall`/`preinstall` in our `package.json`. `@discourse/mcp`'s own
  package.json has no install scripts.
- **OSS readiness — PASS.** No secrets, tokens, or credentials in the diff. Only the public forum
  URL and the public GitHub repo slug appear. `.gitignore` and `.npmignore` both exclude
  `profile.json`, `*.profile.json`, `profiles/`, `*.key`, `*.pem`, `secrets/`, `.env*`.
  `package.json` `files: ["src"]` ships only source — plans/reports/docs/.github are excluded.

## Dependency Audit
`npm audit --omit=dev`: 2 moderate (transitive, under `@discourse/mcp@0.2.9` → `@modelcontextprotocol/sdk`
→ `@hono/node-server`). Not reachable in this wrapper's stdio-only usage; Windows-only. See M1.
No Critical/High. Our direct dependency surface is clean and correctly pinned.

## Verdict
STATUS: APPROVED (with notes)
No Critical or High findings. M1 is an upstream-tracked transitive advisory not reachable in
this usage; L1/L2 are advisory. Wrapper is secret-free and OSS-safe to make public.
