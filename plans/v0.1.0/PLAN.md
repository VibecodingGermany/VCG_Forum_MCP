# PLAN v0.1.0 — VCG Forum MCP

> Status: **DRAFT — awaiting owner sign-off**
> Owner: cubetribe (VibecodingGermany)
> Created: 2026-07-21

## 1. Goal

Give VibecodingGermany forum members a way to drive their self-hosted **Discourse**
forum from inside their own AI sessions (Claude Code / Desktop, etc.), acting **as
themselves** — e.g. *"aktualisiere meinen Forum-Post"*, *"schau ob jemand geantwortet hat"*.

## 2. Core decision (from research + adversarial verification)

**HYBRID / ADOPT — do NOT fork, do NOT build from scratch.**

An **official** MCP server exists: [`@discourse/mcp`](https://github.com/discourse/discourse-mcp)
by Discourse Inc. — **MIT-licensed**, actively maintained (v0.2.9, 2026-07-03), stdio server,
with **per-user User API Key** auth and **opt-in, safe-by-default write tools**. It already
implements the exact "authorize once in the browser" user story.

→ We **adopt it as the engine** and add a thin **VCG layer**: branded onboarding, a
pre-configured setup for our forum, security docs, and (optionally) any custom tools
contributed **upstream** rather than maintained in a fork.

Rationale, evidence and sources: `reports/v0.1.0/sprint-00/00-research-synthesis.md` (+ 5 angle reports).

## 3. Architecture (v1)

- **Deployment:** local **stdio**, each member runs it in their own client. No central
  server, no token database, €0 infra. (A hosted remote endpoint is explicitly **deferred** — see Sprint 04.)
- **Auth:** native Discourse **User API Keys**. First run → RSA keypair + browser authorize
  on our forum → encrypted key returned → decrypted **locally** → stored in the member's
  own profile/OS keychain, sent as `User-Api-Key` header. Key never touches a VCG server.
  Inherits the member's own permissions + rate limits (20/min, 2880/day), 180-day inactivity expiry.
- **No Clerk in v1.** Clerk / OAuth 2.1 only becomes relevant *if* we later build a central
  hosted multi-user endpoint (Sprint 04). For local-install, Discourse is the identity provider.
- **Capability scope v1:** read **+ write** (owner decision). Guardrails: `--read_only` default
  stays on unless the member explicitly opts into the write build; writes are rate-limited;
  forum content is treated as **untrusted** input; write actions get human confirmation.

## 4. Owner-locked decisions

| # | Decision | Value |
|---|----------|-------|
| 1 | Repo visibility | **private** now (org team `trusted-coders` = write); public later possible → secret-free from day 1 |
| 2 | v1 capability | **read + write** ("soll direkt geil sein") |
| 3 | Deployment | **local-first**; remote hosted = deferred/optional |
| 4 | Token custody | **never central** in v1 — client-side only |

## 5. Owner decisions — RESOLVED 2026-07-21

- **A. Adopt vs from-scratch** — ✅ **ADOPT** the official `@discourse/mcp`, thin VCG layer.
- **C. Write enablement** — ✅ **write in v1 with guardrails** (confirmation + rate limits +
  untrusted-content posture); accept the one-time admin toggle of `write` in `allow_user_api_key_scopes`.
- **D. Onboarding polish** — ✅ **one-command wrapper** `@vibecoding/forum-mcp` (bakes `--site`,
  runs auth, prints client config).

### Still pending (blocks Sprint 01 live spike)
- **B. Forum base URL** — the `--site` value (e.g. `https://forum.vibecodinggermany.de`). **Needed from owner.**
- Admin toggle of the `write` scope on the production forum (owner/admin action, one-time).

## 6. Sprint sequence

| Sprint | Title | Gate |
|--------|-------|------|
| 01 | Spike & verify (read **and** write) against the live forum | @builder + @runtime-platform |
| 02 | VCG onboarding + OSS hygiene (README, setup guide, SECURITY.md, MIT LICENSE, CODEOWNERS, .gitignore, .env.example) | @scribe + @security + @tester |
| 03 | Write enablement + guardrails + trusted-coders pilot | @api-guardian + @builder + @tester |
| 04 | *(deferred/optional)* Remote hosted endpoint (VPS OAuth bridge + KMS token custody) | @architect + @api-guardian |

## 7. Top risks

1. **Prompt injection** from forum content (OWASP LLM #1) — worst once write is on. Mitigate: untrusted-input posture, write confirmation, rate limits, read-only default flag.
2. **Write-scope admin dependency** — write needs a one-time forum site-setting change.
3. **Token security** — keys live ≤180 days; keep client-side, never log (fingerprints only), never build a central store in v1.
4. **"Edit my own post" tool gap** — confirm in Sprint 01 that a post-body-edit tool exists; if not, contribute `discourse_update_post` upstream (hybrid anticipated this).
5. **Upstream dependency** — pin `@discourse/mcp` versions, keep wrapper thin, watch upstream security PRs.

## 8. Version relevance

Initial release line **v0.1.0**. VERSION is written once, by the release sprint's tooling — not before.
