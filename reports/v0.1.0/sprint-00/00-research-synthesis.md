---
title: VCG Forum MCP — Architecture Decision Memo (Research Synthesis)
version: v0.1.0
sprint: sprint-00
author: "@architect"
date: 2026-07-21
status: decision-for-owner-review
---

# VCG Forum MCP — Decision Memo

> One-line verdict: **Do not build from scratch and do not hard-fork.** Adopt the
> official `@discourse/mcp` as the engine, wrap it in a thin VCG onboarding/deployment
> layer, ship **local-stdio + per-user User API Keys, read-only-first**. This is a
> **HYBRID** (adopt-and-wrap) decision.

---

## 1. Decision: FORK vs BUILD vs HYBRID → **HYBRID (adopt official + thin wrapper)**

**What "hybrid" means here:** take `discourse/discourse-mcp` (`@discourse/mcp`) as-is as
the core MCP engine; build *only* the VCG-specific layer around it — member onboarding
docs, key-generation UX, deployment config, `SECURITY.md`, and (later, if needed) a remote
auth bridge. Any custom tools (e.g. moderation review queue) are **contributed upstream**,
never forked into a divergent copy.

**Why not FORK:** The adversarial verdict **CONFIRMED** the official server: MIT-licensed
(adoption/redistribution permitted even for a possibly-public repo), per-user User API Key
auth with no global admin key, write tools opt-in and safe-by-default, and active
maintenance (v0.2.7 on npm, commits as recent as July 2026, security fixes landing). Every
community fork evaluated (`mcp-research`, `AshDevFr`, `bartlomiejwolk`, `devzspy`) is either
a slower duplicate, search-only, or a single-feature extension. Forking buys us nothing and
costs us divergence + security-patch lag.

**Why not BUILD from scratch:** The official implementation already satisfies all hard
requirements (per-user write on behalf of the individual, search/read, notifications,
multi-platform). Rebuilding would re-derive the RSA User-API-Key handshake, the tool schema,
and the safe-by-default posture for zero differentiation.

**Why HYBRID wins:** We get a maintained, canonical engine *and* keep a clean, secret-free,
OSS-friendly repo that is mostly config + docs — ideal for the "may go public later" goal.

---

## 2. Recommended Hosting → **Local-stdio-first; VPS co-located if/when a shared remote server is needed**

The single most important architectural clarification (from the hosting verdict): the
research conflated **two auth models**. The official server authenticates to Discourse with
**User API Keys** (Discourse-native, per-user, header `User-Api-Key`), *not* by making
Discourse an OAuth provider. Discourse is an OAuth **provider**, not a natural OAuth
**consumer**, and the MCP spec recommends bearer tokens be **client-held**, not persisted in
an application Postgres. That reshapes hosting:

**Ranking:**

1. **Local stdio, per user (MVP — recommended).** Each member runs `npx @discourse/mcp`
   inside their own Claude Code session and holds their own User API Key in their OS
   credential store. **No central server, no token database, no OAuth bridge, no
   confused-deputy surface, $0 hosting.** This is the exact shape the target use cases
   ("update *my* post", "did anyone reply to *my* topic") demand, and it is what the
   official server is built for. Hosting question effectively disappears for v1.

2. **VPS co-located (best remote option, for later).** If VCG later wants a single shared
   HTTPS endpoint (e.g. for Claude.ai web / non-CLI clients), the existing Discourse
   Ubuntu+Docker VPS is the right host: low latency to Discourse, reuses existing ops. But
   the verdict flags real cost: an MCP OAuth 2.1 layer must be added to map sessions →
   per-user keys, tokens must be encrypted at rest (KMS/AES-256-GCM, **not** plaintext
   Postgres), and the honest effort is ~2–4 days, not 1–2.

3. **Cloudflare Workers (constrained).** Only viable *with* Durable Objects for per-user
   state; plain Workers are stateless and connection-limited. Defer unless global scale
   materializes.

4. **Supabase Edge Functions (not recommended).** ~400ms cold start is unacceptable for
   interactive agent calls; separate token DB complicates sync.

---

## 3. Auth Architecture — MCP session → per-user Discourse User API Key (end-to-end)

**One-time admin prerequisite (verdict-corrected):** Write is **not** free. The verdict
downgraded the "no admin needed" claim to **partial**: `enable_api` and
`allow_user_api_keys` must be ON (defaults ON), and for write, an admin must include write
in `allow_user_api_key_scopes`. Read-only needs no such change.

**MVP flow (local stdio — recommended):**
1. Member adds the server in Claude Code (`@discourse/mcp`, `--site https://forum.vcg…`).
2. On first call the server generates an RSA keypair, opens the browser to
   `/user-api-key/new` on the VCG forum with the public key + requested scopes
   (`read`, `notifications`, `session_info`; `write` only in the write build).
3. Member authorizes in their logged-in browser session. Discourse encrypts the key with
   the public key; the server decrypts it locally with the private key — **the key is never
   sent in cleartext and never touches a VCG-run server.**
4. Key is stored in the member's OS credential store and sent as `User-Api-Key` on each
   request. It inherits the member's own forum permissions and rate limits (20 req/min,
   2880/day), and auto-expires after 180 days of inactivity → re-auth prompt.

**Remote flow (later, if a shared endpoint is built):** MCP client does OAuth 2.1 + PKCE to
the *VCG MCP server* to establish user identity; the server maps that session to a stored,
KMS-encrypted per-user User API Key. Because this reintroduces server-side token custody
(the risk the verdict warned about), it is deliberately **out of v1**.

---

## 4. Capability Scope for v1 (read-only-first)

**v1.0 — read-only (ship first):**
- `discourse_search` — "did anyone write about X"
- `read topic` / `read post` — read replies to my topic
- `read notifications` — check for replies/mentions
- `session_info` / whoami — confirm the acting user

**v1.1 — opt-in write (only after owner sign-off + admin scope enable):**
- `create_post` (reply), `create_topic`
- `update_post` (edit my own post) — the headline "update my forum post" use case

Posture: **read-only by default** (`--read_only=true`), write is an explicit per-user opt-in
build/flag, rate-limited, guarded by Discourse's own edit-time and category permissions.

---

## 5. Top Risks

1. **Prompt injection from forum content (OWASP LLM #1).** A malicious post can hijack the
   agent — most dangerous once write is enabled (confused-deputy → auto-posting/editing).
   Mitigate: read-only default, write opt-in + human confirmation on writes, treat forum
   text as untrusted data, aggressive rate limits.
2. **Token security / long-lived keys.** User API Keys live up to 180 days. Keep them
   **client-side** (OS keychain); do **not** build a central Postgres token store for MVP
   (verdict). Never log keys — fingerprints only.
3. **Write-scope admin dependency (expectation risk).** Write requires a one-time admin
   config; the "zero admin" framing is false. Owner + forum admin must knowingly enable it.
4. **Over-broad scope / confused deputy.** Request minimal scopes; never use a global/admin
   key; validate object ownership.
5. **Remote-hosting complexity.** VPS remote adds an OAuth bridge + encrypted token custody;
   Cloudflare plain Workers is not viable. Defer remote until there's a concrete need.
6. **Upstream dependency.** We ride `@discourse/mcp`. Mitigate: pin versions, keep the
   wrapper thin, watch upstream security PRs, contribute features rather than fork.

---

## 6. Concrete Next Steps (sprint sequence)

- **Sprint 01 — Spike & verify (read-only):** Verify `enable_api`/`allow_user_api_keys` on
  the VCG forum; install `@discourse/mcp`; generate a personal User API Key; validate
  search/read/notifications in Claude Code. Confirm the RSA handshake works against the live
  VPS. *(@builder + @runtime-platform; needs Bash from orchestrator.)*
- **Sprint 02 — Onboarding & OSS hygiene:** Member setup guide (key gen, scopes, Claude Code
  config), `.env.example`, `.gitignore`, `SECURITY.md`, MIT license, CODEOWNERS. *(@scribe +
  @security.)*
- **Sprint 03 — Write pilot (gated by owner decision):** If write approved, admin enables
  write scope; pilot `update_post`/`create_post` with a small group behind confirmation +
  rate limits. *(@api-guardian + @builder + @tester.)*
- **Sprint 04 — Remote hosting eval (optional):** Only if a shared endpoint is wanted —
  design VPS OAuth bridge + KMS token custody. Requires @architect + @api-guardian before
  any build.

---

## 7. Open Decisions for the Human Owner (agents must NOT decide alone)

1. **Read-only vs include write in v1** — writes carry the prompt-injection/confused-deputy
   risk; needs explicit owner sign-off.
2. **Hosting final call & timing** — local-stdio-only (recommended) vs building a shared
   remote VPS endpoint, and when.
3. **Public vs private repo timing** — when to flip the repo public (drives secret-hygiene
   deadline).
4. **Tech stack confirmation** — adopting official implies TypeScript/Node; confirm no
   appetite for a from-scratch reimplementation in another language.
5. **Server-side token custody** — whether we ever store per-user keys centrally (security
   posture change); default recommendation is "never for v1".
6. **Admin authorization** to enable `allow_user_api_key_scopes` write on the production
   forum.

---

## Sources (key URLs)

- Official server: https://github.com/discourse/discourse-mcp · https://www.npmjs.com/package/@discourse/mcp · https://blog.discourse.org/2025/10/discourse-mcp-is-here/ · https://raw.githubusercontent.com/discourse/discourse-mcp/main/LICENSE
- User API Keys: https://meta.discourse.org/t/user-api-keys-specification/48536 · https://meta.discourse.org/t/create-and-configure-an-api-key/230124 · https://github.com/discourse/discourse/blob/main/app/controllers/user_api_keys_controller.rb · https://meta.discourse.org/t/can-non-admin-user-issue-their-own-api-key/173226
- MCP transport & auth: https://modelcontextprotocol.io/specification/2025-03-26/basic/transports · https://modelcontextprotocol.io/docs/tutorials/security/authorization · https://github.com/modelcontextprotocol/typescript-sdk · https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/
- Hosting: https://blog.cloudflare.com/remote-model-context-protocol-servers-mcp/ · https://developers.cloudflare.com/workers/platform/limits/ · https://supabase.com/blog/mcp-server
- Security: https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices · https://securityboulevard.com/2026/01/mcp-security-how-to-prevent-prompt-injection-and-tool-poisoning-attacks/
