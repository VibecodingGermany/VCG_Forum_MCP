---
sprint: 01
title: Spike & verify — @discourse/mcp against forum.vibecoding-germany.de
author: orchestrator (autonomous verification)
date: 2026-07-21
status: in-progress (technical verification done; live per-user auth is the owner's onboarding step)
---

# Sprint 01 — Spike Report

## Summary
The official `@discourse/mcp` (v0.2.9, MIT) is a match for VCG. All technical unknowns
resolved autonomously; the only remaining step is a per-user browser authorization, which
is inherently owner/member-driven (their forum login + their private key).

## Findings

### Forum confirmed
- `https://forum.vibecoding-germany.de/about.json` → **HTTP 403** `{"error_type":"not_logged_in"}` (German locale) — confirms a **Discourse** instance that is **login-required** (members-only). Root `/` → 302 (redirect to login).
- Implication: anonymous access is off; every call must be authenticated as a member — exactly our per-user User API Key model. No public/read-anon path to design around.

### Login = DiscourseConnect SSO → Clerk (important)
- `/session/sso` → 302 to `https://vibecoding-germany.de/api/discourse/sso?sso=…&sig=…`. The main site is the **DiscourseConnect SSO provider**, authenticating via **Clerk**. `/login` returns 200 (renders), `/session/csrf.json` → 200.
- `/user-api-key/new` → **200** (route renders); with partial params → **400** (actively validating). ⇒ **User API Keys are enabled and reachable** on this forum.
- Consequence: the one-time authorize routes the browser through Clerk to establish a Discourse session; the MCP still ends up holding a **Discourse User API Key** (header auth). **No Clerk SDK in the MCP for v1.** Onboarding must instruct: *log into the forum first (Clerk), then run the generate flow* — this avoids any SSO return-URL edge case, since the approve page then shows for an already-authenticated session.

### Package runs
- `npx -y @discourse/mcp@latest` logs `Starting Discourse MCP v0.2.9` (stdio server). No `--help` flag on the main server (it just starts).

### Tool inventory (from source `src/tools/builtin/`)
- **Read/query:** `search`, `read_topic`, `read_post`, `get_user`, `list_user_posts`, `list_users` (admin), `filter_topics`, `get_chat_messages`, `get_draft`, `select_site` (hidden when `--site` set).
- **Write:** `create_post`, `create_topic`, `create_category`, `create_user`, `update_topic`, **`update_post`**, `update_user`, `upload_file`, `save_draft`, `delete_draft`.
- **Data Explorer:** `create_query`, `run_query`, `get_query`, `update_query`, `delete_query`.
- **Remote:** `tool_exec_api` (Discourse AI `/ai/tools`; disable via `--tools_mode=discourse_api_only`).

> **Resolved unknown:** `src/tools/builtin/update_post.ts` exists → **editing one's own post body is natively supported.** The headline "aktualisiere meinen Forum-Post" case needs **no** upstream contribution.

### Auth CLI (authoritative, from `src/user-api-key-generator.ts`)
Subcommand: `discourse-mcp generate-user-api-key`
| Flag | Default | Notes |
|------|---------|-------|
| `--site <url>` | (required) | |
| `--scopes <csv>` | `read,write` | comma-separated |
| `--application-name <name>` | `Discourse MCP` | shown on the authorize page |
| `--client-id <id>` | `discourse-mcp` | |
| `--nonce <n>` | timestamp | |
| `--payload <b64>` | — | skip the interactive paste |
| `--save-to <file>` | — | write a profile file instead of printing the key |

Flow: RSA keypair (local) → prints authorize URL → user logs in & approves → user pastes the
encrypted payload → tool decrypts → prints or `--save-to` a profile (`{site, user_api_key, user_api_client_id}`).
Server then consumes it via `--profile <file>` (maps to `auth_pairs`).

### Write enablement (confirmed prerequisite)
Requesting the `write` scope only succeeds if the forum admin allows it via the
`allow_user_api_key_scopes` site setting (default is read-only scopes). One-time owner/admin action.

## Acceptance criteria status
- [x] Tool inventory + exact CLI recorded.
- [x] "Edit own post" capability confirmed (`update_post` exists).
- [ ] Live read tools return data — pending member auth (owner step).
- [ ] Live reply created — pending member auth + (for write) the admin scope toggle.

## Next
Owner authorizes once (command handed over), we wire it into the client and do a live read →
then flip write on after the `allow_user_api_key_scopes` toggle. Then Sprint 02 (one-command wrapper).
