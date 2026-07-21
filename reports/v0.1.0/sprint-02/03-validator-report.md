---
sprint: 02
title: Validator report — @vibecoding/forum-mcp wrapper
author: validator
date: 2026-07-21
---

# Validator report — VCG Forum MCP wrapper

## Scope validated
Untracked/modified files per `git status`: `.npmignore`, `package.json`, `package-lock.json`, `src/**`, `reports/v0.1.0/sprint-02/` (builder + this report). The one tracked modification (`plans/v0.1.0/sprint-02-onboarding.md`, `status: planned` → `in-progress`) is the orchestrator's own sprint-frontmatter flip, not foreign code — no conflict.

## Checks run

### package.json
- `"type": "module"` ✅
- `"bin": {"vcg-forum-mcp": "src/cli.js"}` ✅
- `"engines": {"node": ">=18"}` ✅
- `"files": ["src"]` ✅ (whitelist confirmed via `npm pack --dry-run`: tarball contains only `LICENSE`, `README.md`, `package.json`, `src/**` — 10 files, 13.4kB unpacked)
- `"license": "MIT"` ✅, `LICENSE` file present ✅
- `"repository": "github:VibecodingGermany/VCG_Forum_MCP"` ✅
- `"dependencies": {"@discourse/mcp": "0.2.9"}` — exact pin, no `^`/`~` ✅

### Install / resolver
- `rm -rf node_modules package-lock.json && npm install` → clean install, 94 packages.
- `npm ls @discourse/mcp` → `@discourse/mcp@0.2.9` (exact match). `package-lock.json` confirms `"version": "0.2.9"`. ✅
- `resolveDiscourseMcpBin()` (via `createRequire` → `require('@discourse/mcp/package.json').bin`, joined with `path.dirname(require.resolve(...))`) — verified conceptually and via builder's own debug run (`node_modules/@discourse/mcp/dist/index.js`, exists: true). Logic is sound: reads `bin` field (string or object), falls back to `discourse-mcp` key or first entry, throws a clear error if absent. ✅

### CLI smoke tests (all re-run independently)
| Command | Exit | Notes |
|---|---|---|
| `node src/cli.js --version` | 0 | prints `0.1.0` |
| `node src/cli.js help` | 0 | full usage text, mentions `--write` and secret-hygiene note |
| `node src/cli.js config` | 0 | see below |
| `node src/cli.js` (no profile, `XDG_CONFIG_HOME` pointed at empty temp dir) | 1 | friendly "run `vcg-forum-mcp login` first" message |
| `node src/cli.js serve --write` (no profile) | 1 | same friendly gate — correctly checked before write-flag logic |
| `node src/cli.js foobar` | 1 | "Unknown command" + help pointer |
| `node src/cli.js --version --extra` | 0 | extra arg ignored, no crash |

`cli.js` has the shebang (`#!/usr/bin/env node`) and is executable (`755`, confirmed via `stat`). ✅

### `config` output
Contains, in both read-only and write variants:
- a `claude mcp add vcg-forum -- vcg-forum-mcp serve ...` command
- a `.mcp.json` snippet (`args: ["serve"]` vs `args: ["serve", "--write"]`)
- correct, resolved `getProfilePath()` value (`~/.config/vcg-forum-mcp/profile.json` or `$XDG_CONFIG_HOME` equivalent)
- both `npx -y github:.../VCG_Forum_MCP` and the future `npx -y @vibecoding/forum-mcp` forms
- the write-scope admin-setting note

Matches architect acceptance criterion "print the `claude mcp add` … + `.mcp.json` snippet, read-only and write variants". ✅

### Write posture
- `serve.js`: `writeRequested = write || process.env.VCG_FORUM_MCP_ALLOW_WRITES === '1'`; only then are `--read_only=false --allow_writes=true` appended. Default path has neither flag → read-only-by-default at the wrapper level (actual read-only enforcement is upstream in `@discourse/mcp`, as expected for a thin wrapper). ✅
- `--write` and env var both verified to gate identically by code inspection (both funnel into the same `writeRequested` boolean). Not independently re-tested with a real profile (would require live credentials), but the gating logic is simple, deterministic, and directly readable — low risk.

### spawn semantics
- `runDiscourseMcp` uses `spawnSync(process.execPath, [binAbs, ...args], { stdio: 'inherit' })` — args passed as an **array**, never shell-interpolated. ✅
- Exit code propagation: `result.status ?? 1`, plus `result.error` handling with a clear message and `return 1` on spawn failure. ✅
- `stdio: 'inherit'` used for both `login` (interactive paste) and `serve` (MCP stdio transport). ✅

### Security / secret hygiene
- No file reads or logs the profile's contents anywhere in `src/**` (grep-confirmed: only `fs.existsSync`/`fs.chmodSync` touch `profile.json`, never `fs.readFileSync`).
- `ensureConfigDir()` creates `0700` (mkdir mode + enforced `chmodSync` fallback for umask edge cases).
- `lockDownProfileIfPresent()` chmods to `0600` after login, best-effort with a caught exception (non-fatal on filesystems without POSIX perms).
- Only the profile *path* is ever printed (`login.js`, `config.js`). ✅
- No telemetry / no network calls of the wrapper's own. ✅

### Code quality
- ESM used consistently (`import`/`export`, no `require()` outside the two `createRequire` bin/package.json lookups, which is the correct, standard pattern for this).
- No dead code found in the 7 source files.
- Error handling: `discourse.js` catches spawn failure; `serve.js`/`login.js` guard on `profileExists()`; `cli.js` has an explicit unknown-command branch.

## Issues found

1. **[LOW / cosmetic]** `src/commands/config.js:16-21` — the printed `claude mcp add` snippets append `--site <SITE> --profile <profilePath>` as extra args to `vcg-forum-mcp serve`. Since `serve.js` already bakes `--site`/`--profile` unconditionally (`serve.js:16`) and `cli.js`'s `runServe` forwards *all* non-`--write` args verbatim as `extraArgs` (no dedup, no `--`-prefix requirement for site/profile), literally copy-pasting the printed command would pass `--site`/`--profile` to the underlying `discourse-mcp` binary **twice** (same values both times, so functionally harmless — last-flag-wins for virtually all CLI parsers — but redundant and slightly confusing for a "copy-paste this command" UX). Not a correctness bug in the strict sense (values are identical) and not blocking, but worth a one-line follow-up: either have `printConfig()` emit the bare `vcg-forum-mcp serve` (relying on the wrapper's own baked config) or have `serve.js` recognize/ignore an explicit `--site`/`--profile` passthrough instead of duplicating.

No CRITICAL, HIGH, or MEDIUM issues found. All architect acceptance criteria are met:
- [x] `npm install` resolves `@discourse/mcp@0.2.9` exactly; bin resolver finds a real, existing file
- [x] `help`/`config`/`--version` run without a profile
- [x] `serve` errors cleanly with guidance when no profile exists (with and without `--write`)
- [x] Write is off unless explicitly opted in (`--write` flag or `VCG_FORUM_MCP_ALLOW_WRITES=1`)
- [x] No secret is ever printed/written outside the `0600` profile file
- [x] spawn uses an args array, stdio inherited, exit code propagated

## Final Status
✅ APPROVED — Ready for @scribe. The one LOW finding is a non-blocking UX polish suggestion, not a defect.
