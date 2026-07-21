# VCG Forum MCP

Access the **VibecodingGermany** Discourse forum from your AI sessions (Claude Code / Desktop) — **as yourself**. Ask your assistant to *"update my forum post"* or *"check if anyone replied to my topic"*, right from where you already work.

> **Status: v0.1.0 (stable)** — local-first, read-only by default, opt-in write support.

## What this is

A thin VibecodingGermany wrapper around the **official** [`@discourse/mcp`](https://github.com/discourse/discourse-mcp) server (MIT, by Discourse Inc.). You run it **locally**; on first use, it authorizes once against our forum via a **per-user Discourse User API Key**, then lets your assistant search, read, and — opt-in — write on your behalf.

- **No central server, no stored tokens.** Your key stays in a local `0600` profile file on your own machine; it never touches a VCG server.
- **Write is opt-in and guarded.** Confirmation before write actions, rate limits, forum content treated as untrusted.
- **Per-user permissions.** The key inherits exactly your forum rights and rate limits.

## Quick start (3 steps)

### 1. Install

Run it straight from the private repo — all `trusted-coders` have access, no install needed:

```bash
npx -y github:VibecodingGermany/VCG_Forum_MCP login
```

Or clone and link for a local `vcg-forum-mcp` binary:

```bash
git clone https://github.com/VibecodingGermany/VCG_Forum_MCP.git
cd VCG_Forum_MCP && npm install && npm link
```

_Once published to npm, `npm install -g @vibecoding/forum-mcp` will also work._

### 2. Authorize

**Important:** Log into [https://forum.vibecoding-germany.de](https://forum.vibecoding-germany.de) in your browser **FIRST** using Clerk SSO. Make sure you are signed in, then run:

```bash
vcg-forum-mcp login
```

This opens an authorization URL. Approve it in your browser (you should still be signed in), copy the encrypted payload, and paste it back into the terminal. Your personal User API Key is saved to `~/.config/vcg-forum-mcp/profile.json` (permissions `0600`, read-only by you).

### 3. Add to Claude Code

Run:

```bash
vcg-forum-mcp config
```

This prints the `claude mcp add` command and `.mcp.json` snippet. Use the **read-only** (default) variant unless you need write access:

**Read-only (safe, default):**
```bash
claude mcp add vcg-forum -- vcg-forum-mcp serve
```

**Write-enabled (opt-in, requires admin scope):**
```bash
claude mcp add vcg-forum -- vcg-forum-mcp serve --write
```

Add the MCP to your Claude Code config, and you're ready. Your assistant can now interact with the forum on your behalf.

## Commands

| Command | Alias | Purpose |
|---------|-------|---------|
| `vcg-forum-mcp login` | `auth` | Authorize once; saves your Discourse User API Key locally |
| `vcg-forum-mcp serve` | (default, no args) | Start the MCP server (requires prior `login`) |
| `vcg-forum-mcp config` | `print-config` | Print the `claude mcp add` command and `.mcp.json` snippet |
| `vcg-forum-mcp help` | `--help`, `-h` | Show usage |
| `vcg-forum-mcp --version` | | Print the installed version |

## Write mode (opt-in)

Write access is **off by default** — your assistant can only read. To enable writes:

1. **Forum admin requirement (one-time):** An admin must enable the `write` scope in the forum's site settings under `allow_user_api_key_scopes`. Ask a VCG admin.
2. **Your choice:** Use `--write` flag or set `VCG_FORUM_MCP_ALLOW_WRITES=1`:

```bash
vcg-forum-mcp serve --write
```

Or add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "vcg-forum": {
      "command": "vcg-forum-mcp",
      "args": ["serve", "--write"]
    }
  }
}
```

**Safety:** Keep writes off unless you really need them. When enabled, your assistant can post, edit, and delete as you. Always review what it's about to do. See [SECURITY.md](SECURITY.md) for details.

## Token security

Your Discourse User API Key is:

- Stored locally in `~/.config/vcg-forum-mcp/profile.json` with read-only permissions (`0600`).
- Never sent to a VCG server — only to the Discourse forum.
- Expires after 180 days of inactivity. After that, just run `vcg-forum-mcp login` again.
- Scoped to your forum permissions and rate limits (20 requests/min, 2880/day).

See [SECURITY.md](SECURITY.md) for more.

## Troubleshooting

### "No local profile found — you need to log in first"

Run:
```bash
vcg-forum-mcp login
```

### Login redirects incorrectly or shows "unauthorized"

**Make sure you are signed into the forum in your browser first.** The authorization flow uses Clerk SSO. If you're not already logged in to [https://forum.vibecoding-germany.de](https://forum.vibecoding-germany.de), the callback may not recognize you.

**Fix:**
1. Open [https://forum.vibecoding-germany.de](https://forum.vibecoding-germany.de) in your browser.
2. Sign in with Clerk.
3. Run `vcg-forum-mcp login` again.
4. When the URL appears, open it in the **same browser** (the one where you're already signed in).

### "Serve is read-only by default" or write actions fail

Writes are off unless you explicitly enable them **and** an admin enables the `write` scope on the forum. Run:

```bash
vcg-forum-mcp serve --write
```

If it still doesn't work, ask a VCG admin to verify the `allow_user_api_key_scopes` setting.

## Contributing

Custom forum tools are contributed **upstream** to [`@discourse/mcp`](https://github.com/discourse/discourse-mcp) where possible, rather than maintained here. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) — © 2026 VibecodingGermany.
