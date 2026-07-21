---
sprint: 01
title: Spike & verify official @discourse/mcp against the live VCG forum
status: in-progress
version_relevance: patch
---

# Sprint 01 — Spike & Verify

## Goal
Prove the official `@discourse/mcp` works against our live forum for both **read** and
**write**, and pin down the exact commands + tool names we will ship in the onboarding docs.

## Scope
- Confirm forum-side prerequisites: `enable_api`, `allow_user_api_keys` on; for write,
  `write` present in `allow_user_api_key_scopes`.
- Run the built-in auth flow: `npx @discourse/mcp@latest generate-user-api-key --site <FORUM_URL>`
  → authorize in browser → obtain a personal User API Key → save to a profile.
- Wire into Claude Code and validate **read** tools: `discourse_search`, `discourse_read_topic`,
  `discourse_read_post`, `discourse_list_user_posts`, notifications/`session_info` equivalent.
- Validate **write** end-to-end on a throwaway topic: `discourse_create_post` (reply) and the
  **"edit my own post"** path. **Explicitly confirm** whether a post-body edit tool exists
  (`discourse_update_topic` vs a missing `discourse_update_post`). Record the exact tool matrix.
- Capture exact working CLI + `auth_pairs`/`--profile` JSON shape and the Claude Code config snippet.

## Non-goals
- No VCG wrapper package yet. No public docs yet. No central hosting.

## Write-scope ownership
- `reports/v0.1.0/sprint-01/**` (findings), scratch profile files (gitignored, never committed).
- **No secrets committed.** The personal User API Key stays local.

## Risks
- "Edit own post" tool may be missing → note as an upstream contribution candidate.
- Forum admin setting for write scope may need toggling (owner/admin action).

## Acceptance criteria
- [ ] Read tools return real data from the VCG forum.
- [ ] A reply is successfully created via MCP on a test topic.
- [ ] The "edit my own post" capability is either demonstrated or documented as a gap + plan.
- [ ] Exact commands, tool matrix, and config snippets recorded in the sprint report.

## Test strategy
- Manual live validation against the forum + a disposable test topic; no automated suite this sprint.

## Changelog note
- (at integration) "Verified official @discourse/mcp against the VCG forum (read + write spike)."

## Result
_(filled at integration)_
