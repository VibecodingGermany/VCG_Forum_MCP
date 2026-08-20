# VCG Forum MCP 🚀

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-Protocol-purple.svg)](https://modelcontextprotocol.io)
[![Community](https://img.shields.io/badge/Community-VibeCoding%20Germany-orange.svg)](https://forum.vibecoding-germany.de)
[![Author](https://img.shields.io/badge/Author-Dennis%20Westermann-black.svg?logo=github)](https://github.com/cubetribe)

> Connect your local AI coding assistant (**Claude Code**, **Claude Desktop**, **Antigravity**, **Cursor**, **Codex**) directly to the [VibeCoding Germany Forum](https://forum.vibecoding-germany.de) — search discussions, get digest summaries, and draft posts with human-in-the-loop verification.

---

## 🌟 What is VCG Forum MCP?

**VCG Forum MCP** is a local-first [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server engineered for Discourse forums. While pre-configured out-of-the-box for the **[VibecodingGermany Community](https://forum.vibecoding-germany.de)**, it is designed to work with any modern Discourse instance.

Instead of constantly context-switching between your terminal/IDE and the browser, you can interact with the forum directly from your AI pairing sessions:

- 🔍 *"Hat im Forum schon mal jemand über dieses Problem / diesen Stack gesprochen?"*
- 📰 *"Fasse mir die 5 neuesten Diskussionen aus dieser Woche zusammen."*
- ✍️ *"Schreibe einen Entwurf für einen Forum-Beitrag über mein neues Release."*

Every answer includes **direct jump-links** back to the forum threads (`https://forum.vibecoding-germany.de/t/slug/id`), maximizing community engagement while keeping you in the flow.

---

## ⚡ Core Features

- 🔎 **Deep Forum Search (`discourse_search`):** Search topics and posts by keywords, tags, or categories.
- 📋 **Activity & Thread Summaries (`discourse_filter_topics`, `discourse_read_topic`):** Read complete discussions or latest activity feeds.
- ✍️ **AI Draft Creation (`discourse_save_draft`):** Have your AI prepare topic or reply drafts with automatic category & tag selection. They appear directly in your web browser's forum composer (under `+ Neues Thema` ▾) for your final review before publishing.
- 🛡️ **Zero-Trust & Local-First Security:** No central token database. Your personal Discourse User API Key is generated locally via RSA keypair and stored in `~/.config/vcg-forum-mcp/profile.json` (chmod `0600`).
- 🔐 **Safe by Default:** Read-only mode by default (`--read_only=true`). Write operations require explicit `--write` opt-in.

---

## 🚀 Quick Start (3 Steps)

### Step 1: Sign in to the Forum
Open [https://forum.vibecoding-germany.de](https://forum.vibecoding-germany.de) in your browser and make sure you are signed in (Clerk SSO).

### Step 2: Authorize (One-Time)
Run the login command in your terminal:

```bash
npx -y github:VibecodingGermany/VCG_Forum_MCP login
```

*(Or clone the repository and run `npm install && npm link` to get the `vcg-forum-mcp` CLI globally).*

1. The CLI displays an authorization URL.
2. Open the URL in the browser where you are logged in.
3. Click **Authorize** and copy the encrypted payload.
4. Paste the payload back into the terminal. Your User API Key is saved locally with `0600` permissions.

### Step 3: Add to Your AI Assistant

#### A) Claude Code
```bash
# Read-only (default, safe):
claude mcp add vcg-forum -- npx -y github:VibecodingGermany/VCG_Forum_MCP serve

# Write-enabled (allows saving drafts & posting):
claude mcp add vcg-forum -- npx -y github:VibecodingGermany/VCG_Forum_MCP serve --write
```

#### B) Claude Desktop / Cursor / Antigravity (`.mcp.json` / config)
```json
{
  "mcpServers": {
    "vcg-forum": {
      "command": "npx",
      "args": [
        "-y",
        "github:VibecodingGermany/VCG_Forum_MCP",
        "serve",
        "--write"
      ]
    }
  }
}
```

---

## 💡 How to Use

Once connected, simply talk to your AI assistant:

| Goal | Example Prompt |
| :--- | :--- |
| **Search Knowledge** | *"Suche im Forum nach LiteLLM Setup und fasse die wichtigsten Erkenntnisse zusammen."* |
| **Weekly Digest** | *"Was sind die heißesten Diskussionen der letzten 7 Tage im Forum? Gib mir direkte Links dazu."* |
| **Create a Draft** | *"Erstelle mir einen Entwurf für ein neues Thema über unser MCP-Tool mit passender Kategorie und Tags."* |

### 📌 Finding Your Drafts in the Forum
When the AI creates a draft:
1. Open [forum.vibecoding-germany.de](https://forum.vibecoding-germany.de).
2. Click on **`+ Neues Thema`** (top left) or click the **arrow icon (▾)** next to it to open the list of all saved drafts.
3. Review the text, check the pre-selected category and tags, and click **Thema erstellen**!

---

## 🛠️ CLI Reference

```bash
vcg-forum-mcp login          # Interactive one-time authorization
vcg-forum-mcp serve          # Start MCP server (read-only by default)
vcg-forum-mcp serve --write  # Start MCP server with write/draft support
vcg-forum-mcp config         # Print ready-to-use client snippets
vcg-forum-mcp help           # Show available options
```

---

## 🌐 Custom Discourse Forums

While configured by default for `https://forum.vibecoding-germany.de`, you can tether this MCP server to any Discourse forum:

```bash
vcg-forum-mcp serve --site https://your-discourse-forum.com
```

---

## 🔒 Security & Token Safety

- **No Remote Token Storage:** Your User API Key never leaves your local machine.
- **Strict File Permissions:** Profile files are locked to `0600` (read/write only by owner).
- **Inherited Permissions:** The MCP server operates strictly within your own user permissions, trust level, and rate limits on the forum.
- See [SECURITY.md](SECURITY.md) for full security disclosures.

---

## 👨‍💻 Author & Maintainer

Created & developed with ❤️ by:

**Dennis Westermann**  
- GitHub: [@cubetribe](https://github.com/cubetribe)  
- Website: [dennis-westermann.de](https://dennis-westermann.de)  
- Community Profile: [@Dennis auf VibecodingGermany](https://forum.vibecoding-germany.de)

---

## 🤝 Community & Support

**VibeCoding Germany e.V. (i.G.)**  
- 🌐 Website: [vibecoding-germany.de](https://vibecoding-germany.de)  
- 💬 Community Forum: [forum.vibecoding-germany.de](https://forum.vibecoding-germany.de)  
- 🐙 Organization: [github.com/VibecodingGermany](https://github.com/VibecodingGermany)

Pull requests, issues, and ideas are warmly welcome!

---

## 📄 License

[MIT License](LICENSE) — Copyright (c) 2026 Dennis Westermann / VibecodingGermany.
