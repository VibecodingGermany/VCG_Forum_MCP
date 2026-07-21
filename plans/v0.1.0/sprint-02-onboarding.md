---
sprint: 02
title: VCG onboarding + OSS hygiene
status: done
version_relevance: minor
---

# Sprint 02 — Onboarding & OSS Hygiene

## Goal
Turn the verified setup into a **clean, secret-free, public-ready** VCG repo that a trusted
coder can go from zero → working MCP in a few minutes.

## Scope
- `README.md` — what it is, the member setup path, the exact `--site <FORUM_URL>` config.
- `docs/SETUP.md` — step-by-step: generate User API Key → configure client → verify.
- **Onboarding polish (per owner decision D):**
  - Option 1 (recommended, "geil"): thin wrapper `@vibecoding/forum-mcp` that bakes `--site`,
    runs the auth flow, and prints the client config — one command for members.
  - Option 2 (minimal): documented copy-paste config snippet + helper script only.
- OSS hygiene: `LICENSE` (MIT), `SECURITY.md` (token handling, prompt-injection posture,
  disclosure), `.gitignore` (profiles, keys, .env), `.env.example`, `CODEOWNERS`
  (@trusted-coders), `CONTRIBUTING.md` (upstream-first policy).

## Non-goals
- No write enablement rollout (that is Sprint 03). No remote hosting.

## Write-scope ownership
- Repo root docs + config files listed above. Hot files (README) single-writer at integration.

## Risks
- Secret leakage if example configs include real keys → enforce placeholders + gitignore.

## Acceptance criteria
- [ ] A trusted coder can follow SETUP.md and reach working read tools unaided.
- [ ] No secrets anywhere in the repo; `.gitignore` covers profiles/keys/.env.
- [ ] MIT LICENSE, SECURITY.md, CODEOWNERS present; repo is public-ready.
- [ ] @tester screenshots the onboarding docs / any wrapper output; @security signs off on hygiene.

## Test strategy
- @security review for secret hygiene; @tester validates the setup walkthrough is followable.

## Changelog note
- (at integration) "Added VCG onboarding, setup guide, and OSS hygiene (MIT, SECURITY.md, CODEOWNERS)."

## Result
Delivered the thin wrapper `@vibecoding/forum-mcp` (plain Node ESM) around the official
`@discourse/mcp@0.2.9`. CLI: `login`/`serve`/`config`/`help`/`--version`; **read-only by default**
with an authoritative write opt-in (`--write` / `VCG_FORUM_MCP_ALLOW_WRITES=1`). Full docs
(README, docs/SETUP.md, SECURITY.md, CONTRIBUTING.md, CODEOWNERS, CHANGELOG, .env.example).

Gates: **@validator APPROVED**, **@security APPROVED** (no critical/high; 3 advisory notes tracked:
transitive Windows-only advisory in @discourse/mcp — unreachable here; passthrough write-flag L1;
prompt-injection docs). @tester N/A (CLI, no web UI; playwright not required).

Orchestrator polish post-gate: made the write posture authoritative (append `--read_only`/`--allow_writes`
last → closes security L1), config snippets lead with the working `npx github:` form, and a doc-accuracy
pass (local `0600` profile file vs. "keychain"; install order). Reports in `reports/v0.1.0/sprint-02/`.

Acceptance criteria met, except live end-to-end auth — that is the member onboarding step and remains the
Sprint 01 open item (user-credential + admin-scope gated). Shipped on `feat/sprint-02-wrapper` → PR.
