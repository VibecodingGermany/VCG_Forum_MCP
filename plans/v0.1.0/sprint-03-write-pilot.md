---
sprint: 03
title: Write enablement + guardrails + trusted-coders pilot
status: planned
version_relevance: minor
---

# Sprint 03 — Write Enablement & Pilot

## Goal
Ship the headline write experience ("aktualisiere meinen Forum-Post", reply, new topic)
safely, and pilot it with the `trusted-coders` team before wider rollout.

## Scope
- Admin one-time: enable `write` in `allow_user_api_key_scopes` on the forum (owner/admin action, documented).
- Document + default the write posture: write build/flag is an **explicit per-user opt-in**;
  `--read_only=false --allow_writes` only when the member chooses it.
- Guardrails: human confirmation on write tools, rate-limit guidance, untrusted-content posture,
  a short "safe use" note in SETUP.md (don't let a forum post talk your agent into posting).
- If Sprint 01 found no post-body edit tool: open an upstream PR / issue for `discourse_update_post`
  (or document the `update_topic`/`create_post` workaround) — hybrid upstream-first policy.
- Pilot with a small group from `trusted-coders`; collect feedback.

## Non-goals
- No central hosting. No auto-posting without confirmation.

## Write-scope ownership
- `docs/**` (write section), any wrapper flags. Upstream PRs live in the upstream repo, referenced here.

## Risks
- Prompt injection / confused-deputy once write is live → confirmation + rate limits + untrusted posture are mandatory, not optional.
- Members enabling write without understanding scope → SETUP.md must make the tradeoff explicit.

## Acceptance criteria
- [ ] A member can edit their own post and post a reply via MCP, with a confirmation step.
- [ ] Write is off by default and requires explicit opt-in.
- [ ] SECURITY.md + SETUP.md document the prompt-injection posture and safe use.
- [ ] @api-guardian reviews any tool/flag surface; @tester validates the write flow + confirmation.

## Test strategy
- @tester drives the write flow on a test topic; @api-guardian checks the exposed tool/flag contract; @security spot-checks injection posture.

## Changelog note
- (at integration) "Enabled per-user write (reply/create/edit) with guardrails; piloted with trusted-coders."

## Result
_(filled at integration)_
