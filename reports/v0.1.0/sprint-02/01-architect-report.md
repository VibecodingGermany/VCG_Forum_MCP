---
sprint: 02
title: Inline architecture brief — @vibecoding/forum-mcp wrapper
author: orchestrator (Smart Routing inline brief)
date: 2026-07-21
---

# Architecture brief — VCG Forum MCP wrapper

**Goal:** a *thin* wrapper that turns the official `@discourse/mcp` into a one-command,
pre-configured experience for VCG members, safe-by-default.

## Decisions (5 bullets)
1. **Plain Node ESM JavaScript, zero build step.** Distribution is `npx github:VibecodingGermany/VCG_Forum_MCP` (private repo, gh access) or clone+`npm i`+`npm link`. A TS build would break frictionless `npx github:`. Keep it dependency-light.
2. **Wrapper orchestrates, never reimplements.** It spawns the locally-installed `@discourse/mcp` binary (resolved via `createRequire` → its `package.json.bin`), not `npx` (no re-download). `@discourse/mcp` is a **pinned** dependency (`0.2.9`).
3. **Baked config:** `SITE = https://forum.vibecoding-germany.de`. Profile path = `${XDG_CONFIG_HOME||~/.config}/vcg-forum-mcp/profile.json` (dir `0700`, file `0600`).
4. **Safe-by-default write posture:** server runs **read-only** unless the member explicitly opts in (`--write` flag or `VCG_FORUM_MCP_ALLOW_WRITES=1`), which adds `--read_only=false --allow_writes=true`. Write also needs the forum's `allow_user_api_key_scopes` to include `write` (admin, one-time).
5. **Secret hygiene:** never print/log the key or profile contents — only the profile *path*. No telemetry.

## CLI surface (`bin: vcg-forum-mcp`)
- `vcg-forum-mcp login` (alias `auth`): prints "log into the forum in your browser first (Clerk SSO), then continue", then execs `discourse-mcp generate-user-api-key --site <SITE> --application-name "VCG Forum MCP" --save-to <PROFILE>` with inherited stdio (interactive paste). Creates the config dir `0700`.
- `vcg-forum-mcp` (no args) = **serve**: if profile missing → friendly error ("run `vcg-forum-mcp login` first"), exit 1. Else exec `discourse-mcp --site <SITE> --profile <PROFILE>` (+ write flags when opted in). Stdio passthrough (this is the MCP transport). Forward any extra args.
- `vcg-forum-mcp config` (alias `print-config`): print the `claude mcp add …` command + a `.mcp.json` snippet, read-only and write variants, using the resolved bin path + profile path.
- `vcg-forum-mcp help` / `--help` / `-h` / `--version`.

## Files (write scope for @builder)
`package.json`, `src/**` (`cli.js`, `config.js`, `discourse.js` bin-resolver, `commands/*.js`), `.npmignore`. **Not** `README.md`/`CHANGELOG.md` (owned by @scribe), **not** `plans/**` or `reports/**`.

## Acceptance
- `vcg-forum-mcp help|config|--version` run without a profile.
- `serve` errors cleanly with guidance when no profile; write is off unless opted in.
- No key/secret is ever printed or written outside the `0600` profile file.
- `npm install` resolves `@discourse/mcp@0.2.9`; the bin resolver finds it.
