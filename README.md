# VCG Forum MCP

Access the **VibecodingGermany** Discourse forum from your AI sessions (Claude Code / Desktop) — **as yourself**. Ask your assistant to *"update my forum post"* or *"check if anyone replied to my topic"*, right from where you already work.

> **Status: early development (v0.1.0)** — bootstrapping. Direction and research: [`plans/v0.1.0/PLAN.md`](plans/v0.1.0/PLAN.md) · [`reports/v0.1.0/sprint-00/`](reports/v0.1.0/sprint-00/).

## What this is

A thin VibecodingGermany layer around the **official** [`@discourse/mcp`](https://github.com/discourse/discourse-mcp) server (MIT, by Discourse Inc.). You run it **locally**; on first use it authorizes once against our forum via a **per-user Discourse User API Key**, then lets your assistant search, read, and — opt-in — write on your behalf.

- **No central server, no stored tokens.** Your key stays in your own OS keychain; it never touches a VCG server.
- **Write is opt-in and guarded** — confirmation before write actions, rate limits, forum content treated as untrusted.
- **Per-user permissions.** The key inherits exactly your forum rights and rate limits.

## Setup

One-command onboarding lands in Sprint 02. Until then, see the plan.

## Contributing

Custom forum tools are contributed **upstream** to `@discourse/mcp` where possible, rather than forked here. Write access for the org `trusted-coders` team.

## License

[MIT](LICENSE) — © 2026 VibecodingGermany.
