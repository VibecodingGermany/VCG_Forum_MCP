# Setup Guide — VCG Forum MCP

This guide walks you through setting up VCG Forum MCP step-by-step, including the one-time admin configuration needed for write access.

## Prerequisites

- **Node.js ≥ 18** (check with `node --version`)
- GitHub CLI or git (if installing from the private repo)
- A Clerk account linked to the VibecodingGermany forum

## Installation

### Option A: From the private GitHub repo (recommended)

If you have GitHub access to `VibecodingGermany/VCG_Forum_MCP`:

```bash
npx -y github:VibecodingGermany/VCG_Forum_MCP login
```

This installs and runs the login command in one step, so jump directly to [Step 2: Authorize](#step-2-authorize).

### Option B: Clone and link locally

```bash
git clone https://github.com/VibecodingGermany/VCG_Forum_MCP.git
cd VCG_Forum_MCP
npm install
npm link
```

Then use `vcg-forum-mcp` globally.

### Option C: From npm (future, once published)

```bash
npm install -g @vibecoding/forum-mcp
```

## Step 1: Admin enables write scope (one-time, required for writes)

**This step is required if you want write access. If you only need to read, skip to Step 2.**

An admin with Discourse access must enable the `write` scope in the forum's site settings:

1. Log into the forum as an admin: [https://forum.vibecoding-germany.de/admin](https://forum.vibecoding-germany.de/admin)
2. Navigate to **Settings** → **API**
3. Find the setting `allow_user_api_key_scopes` (or search for "api_key_scopes")
4. Add `write` to the allowed scopes. The setting should include at least `read,write`.
5. Save.

This is a one-time change affecting all forum members. After this, anyone who opts in can use write access.

**Without this step, write actions will fail even if you run `--write`.**

## Step 2: Authorize

**Important:** You must be signed into the forum in your browser **before** running this. Open [https://forum.vibecoding-germany.de](https://forum.vibecoding-germany.de), sign in with Clerk, and then run:

```bash
vcg-forum-mcp login
```

You'll see:

```
VCG Forum MCP — login

1. Log into the forum in your browser FIRST: https://forum.vibecoding-germany.de
   (the forum uses Clerk SSO — make sure you are signed in before continuing).
2. This will open a URL to generate a personal User API Key.
   Open that URL, approve the request, and paste the resulting payload back here.

Generating user API key...
```

A URL will be printed. Open it in your browser (in the same browser window where you're signed into the forum). You'll see an approval dialog. Approve it, and a long encrypted payload will appear. Copy it and paste it back into the terminal.

On success:

```
Login complete. Your profile was saved to:
  /Users/you/.config/vcg-forum-mcp/profile.json

Note: write access additionally requires the forum admin setting "allow_user_api_key_scopes" 
to include "write" (a one-time admin change).
You can now run: vcg-forum-mcp serve
```

Your Discourse User API Key is now saved locally in `~/.config/vcg-forum-mcp/profile.json` with secure permissions (`0600`). **It never leaves your machine.**

## Step 3: Add to Claude Code

Run:

```bash
vcg-forum-mcp config
```

You'll see:

```
VCG Forum MCP — client configuration

Site:    https://forum.vibecoding-germany.de
Profile: /Users/you/.config/vcg-forum-mcp/profile.json

== Claude Code (claude mcp add) ==

# Read-only (default, safe)
claude mcp add vcg-forum -- vcg-forum-mcp serve

# Write-enabled (opt-in, requires forum admin scope "write")
claude mcp add vcg-forum -- vcg-forum-mcp serve --write ...
```

Choose the variant you need:

### Read-only (safe, recommended to start)

```bash
claude mcp add vcg-forum -- vcg-forum-mcp serve
```

### Write-enabled (opt-in, requires Step 1)

```bash
claude mcp add vcg-forum -- vcg-forum-mcp serve --write
```

This command adds the MCP server to Claude Code's config. You can also add the `.mcp.json` snippet manually:

```json
{
  "mcpServers": {
    "vcg-forum": {
      "command": "vcg-forum-mcp",
      "args": ["serve"]
    }
  }
}
```

## Step 4: Start using it

Open Claude Code, start a session, and try:

> "Check if anyone replied to my latest forum post."

> "Search the forum for posts about Discourse."

> (Write enabled) "Update my forum post with [new content]."

The MCP will serve forum data and tools to your assistant.

## Verifying your setup

### Test read-only access

```bash
vcg-forum-mcp serve
```

You should see no error. Press Ctrl+C to stop. If you get "No local profile found", go back to [Step 2: Authorize](#step-2-authorize).

### Test write access (if enabled)

```bash
vcg-forum-mcp serve --write
```

Again, no error means it's working. The forum itself will reject write attempts if the admin hasn't enabled the `write` scope or if you lack permission.

### Check your profile location

```bash
cat ~/.config/vcg-forum-mcp/profile.json
```

You should see the file exists (the contents are encrypted, so they won't be human-readable). If it doesn't exist, run `vcg-forum-mcp login` again.

## Token expiry and re-authorization

Your Discourse User API Key expires after **180 days of inactivity**. When it expires, you'll see an error from the forum. Simply run:

```bash
vcg-forum-mcp login
```

A new key will be generated and saved. The old one is discarded.

## Troubleshooting

### "Unauthorized" or "403 Forbidden"

**Cause:** Your API key may have expired or you weren't signed into the forum during login.

**Fix:** Run `vcg-forum-mcp login` again. Make sure you're signed into [https://forum.vibecoding-germany.de](https://forum.vibecoding-germany.de) **before** running the command.

### Write actions fail with "Not allowed"

**Cause:** Either (a) the admin hasn't enabled the `write` scope, or (b) you don't have write permission on that post/topic.

**Fix:** Ask an admin to verify `allow_user_api_key_scopes` includes `write`. If it does, you may lack permission to edit that specific post (e.g., other users' posts can't be edited unless you're a moderator).

### Claude Code doesn't see the forum MCP

**Cause:** The MCP wasn't added to Claude Code's config, or the path is wrong.

**Fix:** Run `vcg-forum-mcp config` again and copy the command exactly. Or edit your Claude Code config manually (usually `~/.config/Claude Code/mcp-config.json` or similar) and paste the `.mcp.json` snippet.

### I'm getting rate-limited

**Cause:** Discourse rate-limits API calls to 20 per minute, 2880 per day per user.

**Fix:** Wait a few minutes. Your assistant will automatically retry after rate-limit errors.

## Next steps

- Read [SECURITY.md](../SECURITY.md) for token safety and prompt-injection guidelines.
- Check [CONTRIBUTING.md](../CONTRIBUTING.md) if you want to contribute tools back to the upstream `@discourse/mcp` project.
- See the [main README](../README.md) for quick reference and troubleshooting.
