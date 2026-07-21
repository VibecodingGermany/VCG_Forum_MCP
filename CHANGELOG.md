# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Thin wrapper package `@vibecoding/forum-mcp` that wraps the official `@discourse/mcp@0.2.9` server
- CLI commands: `vcg-forum-mcp login`, `serve`, `config`, `help`, `--version`
- One-time browser-based authorization flow (Clerk SSO → Discourse User API Key)
- Local profile storage in `~/.config/vcg-forum-mcp/profile.json` (secure `0600` permissions)
- Read-only by default; opt-in write access via `--write` flag or `VCG_FORUM_MCP_ALLOW_WRITES=1`
- Configuration helpers: `vcg-forum-mcp config` prints `claude mcp add` commands and `.mcp.json` snippets (both read-only and write variants)
- Complete documentation: `README.md`, `docs/SETUP.md`, `SECURITY.md`, `CONTRIBUTING.md`
- Security hardening: no key logging, local `0600` profile storage, write gating, prompt-injection warnings

### Notes
- The wrapper delegates all MCP logic to `@discourse/mcp`; custom forum tools should be contributed upstream
- Write access requires admin to enable `write` scope in forum site setting `allow_user_api_key_scopes` (one-time)
- Distribution: `npx -y github:VibecodingGermany/VCG_Forum_MCP` (private repo, gh access required); planned future: `npm install -g @vibecoding/forum-mcp`
