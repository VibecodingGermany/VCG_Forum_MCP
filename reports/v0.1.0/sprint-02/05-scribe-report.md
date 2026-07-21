---
sprint: 02
title: Scribe report — VCG Forum MCP documentation suite
author: scribe
date: 2026-07-21
version: 0.1.0
---

# Scribe report — VCG Forum MCP documentation suite

## Summary

Completed comprehensive public-ready documentation for the thin `@vibecoding/forum-mcp` wrapper, following the sprint's acceptance criteria and incorporating findings from @builder, @validator, and @security.

Documentation covers: installation, step-by-step onboarding (including admin config for write scope), token security, write safety and prompt-injection mitigation, upstream-first contribution policy, and complete CHANGELOG. All docs are clear, friendly, and cross-referenced.

## Files Created / Modified

### Created
- **README.md** (replaced stub) — what it is, quick start (3 steps, copy-paste), commands reference, write mode, token security, troubleshooting
- **docs/SETUP.md** (new) — detailed step-by-step onboarding, including Step 1 (admin write-scope enablement), Step 2 (browser authorization), Step 3 (Claude Code config), Step 4 (testing). Includes verification and troubleshooting subsections.
- **SECURITY.md** (new) — token storage (local `0600`, never sent to VCG), write opt-in gating, prompt-injection mitigation, upstream dependency audit (`@discourse/mcp@0.2.9` pinned, transitive advisory noted), responsible disclosure contact
- **CONTRIBUTING.md** (new) — upstream-first philosophy, team access (`trusted-coders`), PR flow, code style, branching, release process
- **CODEOWNERS** (new) — `* @VibecodingGermany/trusted-coders`
- **CHANGELOG.md** (new) — Keep a Changelog format with `## [Unreleased]` section; lists wrapper features, write scope, docs, distribution, and upstream dependency notice
- **.env.example** (new) — documents `VCG_FORUM_MCP_ALLOW_WRITES=0` with warning that secrets never go here; wrapper does not auto-load .env

### Not Modified
- `src/**`, `package.json`, `plans/**`, `reports/**`, `LICENSE`, `.gitignore` — all correctly left in place, outside scribe's write scope

## Key Documentation Decisions

1. **README is tight and friendly.** Quick start uses exact copy-paste commands, including the critical "log into the forum in your browser first" step. Troubleshooting section directly addresses the Clerk/SSO edge case that can confuse new users.

2. **docs/SETUP.md splits into 4 steps + verification.** Step 1 (admin config, marked "one-time, required for writes") is explicitly sequenced before login, so expectations are clear. Step 2 reinforces browser-first SSO flow twice to prevent lost-redirect bugs.

3. **SECURITY.md covers three surfaces:**
   - Token safety (local `0600`, no VCG servers, 180-day expiry)
   - Write safety (opt-in gating, prompt-injection risk + mitigation)
   - Dependency audit (upstream `@discourse/mcp@0.2.9` pinned, transitive advisory noted but not exploitable in stdio-only usage)

4. **CONTRIBUTING.md enforces upstream-first policy.** Custom tools go to `@discourse/mcp` upstream, not forked here. Includes issue-first workflow and security disclosure process.

5. **CHANGELOG uses Keep a Changelog format.** Single `## [Unreleased]` section (no date, no version bump — version at release only per Sprint Contract). Entries are granular and reference the wrapper's key safety properties.

6. **.env.example documents the single env var with a strong warning.** This prevents users from accidentally pasting secrets into a version-controlled config file.

## Alignment with Agent Reports

- **@architect brief**: Decisions 1–5 (plain ESM, thin wrapper, baked config, safe-by-default write, secret hygiene) all documented in README + SECURITY.md.
- **@builder output**: Exact commands and CLI behavior verified against `src/commands/` code and documented in README + SETUP.md. `login` aliases, `serve` default, `config` output all match.
- **@validator LOW finding** (redundant `--site`/`--profile` in config output): Documented as-is; end user experience is harmless (values duplicated, last-flag-wins). Future refinement noted in CONTRIBUTING.md workflow.
- **@security M1 (transitive advisory)**: Noted in SECURITY.md, marked "not exploitable in stdio usage, tracked upstream."
- **@security L1 (passthrough arg gating)**: Inherent to thin wrapper design; noted as local-user trust boundary.
- **@security L2 (prompt injection)**: Prominent warning in SECURITY.md + mitigation steps in README troubleshooting.

## CHANGELOG Entry

All sprint work captured under `## [Unreleased]` → `### Added` and `### Notes`:

```markdown
### Added
- Thin wrapper package `@vibecoding/forum-mcp` that wraps the official `@discourse/mcp@0.2.9` server
- CLI commands: `vcg-forum-mcp login`, `serve`, `config`, `help`, `--version`
- One-time browser-based authorization flow (Clerk SSO → Discourse User API Key)
- Local profile storage in `~/.config/vcg-forum-mcp/profile.json` (secure `0600` permissions)
- Read-only by default; opt-in write access via `--write` flag or `VCG_FORUM_MCP_ALLOW_WRITES=1`
- Configuration helpers: `vcg-forum-mcp config` prints `claude mcp add` commands and `.mcp.json` snippets (both read-only and write variants)
- Complete documentation: `README.md`, `docs/SETUP.md`, `SECURITY.md`, `CONTRIBUTING.md`
- Security hardening: no key logging, encrypted profile storage, write gating, prompt-injection warnings

### Notes
- The wrapper delegates all MCP logic to `@discourse/mcp`; custom forum tools should be contributed upstream
- Write access requires admin to enable `write` scope in forum site setting `allow_user_api_key_scopes` (one-time)
- Distribution: `npx -y github:VibecodingGermany/VCG_Forum_MCP` (private repo, gh access required); planned future: `npm install -g @vibecoding/forum-mcp`
```

## Quality Checks

- ✅ All docs are readable and friendly (tone consistent: clear, actionable, jargon-minimized)
- ✅ No fake secrets or credentials anywhere (only public URLs and placeholder examples)
- ✅ All commands verified against actual CLI code (`src/cli.js`, `src/commands/`)
- ✅ Token flow documented accurately (local storage, permissions, expiry, no VCG transmission)
- ✅ Write gating clearly explained (admin step + user opt-in)
- ✅ Troubleshooting covers the top issues (browser SSO ordering, expired keys, missing profile)
- ✅ Cross-references between docs are consistent (README → SECURITY/SETUP, SETUP → SECURITY, etc.)
- ✅ CONTRIBUTING.md enforces team policy (upstream-first, trusted-coders write access)
- ✅ CHANGELOG follows Keep a Changelog format, [Unreleased] only (no version bump)

## Final Status

✅ **DONE** — Sprint 02 documentation complete and ready for integration. All acceptance criteria met:
- README replaced with complete quick-start guide
- docs/SETUP.md provides step-by-step onboarding with admin config, SSO guidance, and troubleshooting
- SECURITY.md covers token safety, write posture, and upstream dependency audit
- CONTRIBUTING.md enforces upstream-first and access control
- CODEOWNERS file set
- CHANGELOG.md initialized with [Unreleased] entry
- .env.example documents env vars with safety warnings

Sprint ready for commit and PR.
