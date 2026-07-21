# MCP Remote Server Architecture & Authentication Research
**Project:** VCG Forum MCP  
**Sprint:** v0.1.0 / sprint-00  
**Research Date:** 2026-07-21  
**Angle:** Remote-server architecture, multi-user authentication, client integration  

---

## Executive Summary

The Model Context Protocol (MCP) has evolved to support remote, multi-user servers with standardized OAuth 2.1 authentication. As of the **2025-03-26 specification update** (with further hardening in the **2025-11-25** and upcoming **2026-07-28** release candidate), **Streamable HTTP is the only recommended transport for remote servers**, replacing the earlier HTTP+SSE approach.

For per-user access (required for the VCG Forum MCP project), the MCP spec mandates **OAuth 2.1 with PKCE**. Clients discover the authorization server endpoint from your MCP server, then follow a standard OIDC-style flow to obtain per-user access tokens, which are bound to the user via the Audience claim. The TypeScript SDK (`@modelcontextprotocol/sdk`) is production-ready for remote servers and integrates seamlessly with Node.js, Cloudflare Workers, and serverless platforms.

**Key Finding:** Claude Code and Claude.ai support adding remote MCP servers via the `mcp add --transport http` CLI command and Connectors UI with automatic OAuth flow initiation. This makes per-user Discourse authentication straightforward: the MCP server's OAuth endpoint points to Discourse's OAuth provider, and tokens obtained grant forum access per individual user.

---

## 1. MCP Transports: Evolution and Current State

### 1.1 Two Standard Transports

MCP defines two primary transports for client-server communication:

| Transport | Use Case | Launch Mode | Stateful | Best For |
|-----------|----------|-------------|----------|----------|
| **stdio** | Local MCP servers | Client launches subprocess | Per-connection | Desktop clients, local development |
| **Streamable HTTP** | Remote MCP servers | Server runs independently | Optional (session IDs) | Cloud/edge deployment, multi-user, always-on |

**Reference:** [Transports - Model Context Protocol](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)

### 1.2 Streamable HTTP: The Remote Server Standard

Streamable HTTP became the standard for remote servers starting with the **2025-03-26 specification update**. It replaces the legacy HTTP+SSE transport (from spec version 2024-11-05).

**Key characteristics:**
- Server operates as an independent, always-on process
- Uses HTTP POST to send client requests and HTTP GET to receive server-to-client messages
- Supports Server-Sent Events (SSE) for streaming responses from server
- Enables load balancing and horizontal scaling
- Single HTTP endpoint (e.g., `https://example.com/mcp`)

**Reference:** [The 2026-07-28 MCP Specification Release Candidate | Model Context Protocol Blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)

### 1.3 Stateless Architecture in 2026 Release Candidate

The upcoming **2026-07-28 release candidate** removes stateful session handling entirely, making each request self-contained and routeable to any server instance. This enables:

- Load balancers to route on operation type without sticky sessions
- Mcp-Method and Mcp-Name headers (SEP-2243) for rate-limiting and routing decisions
- Simplified infrastructure (no session affinity required)

**Reference:** [The 2026-07-28 MCP Specification Release Candidate](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)

### 1.4 Backwards Compatibility

Servers may optionally support the deprecated HTTP+SSE transport alongside Streamable HTTP for legacy clients, but this is not recommended for new deployments.

---

## 2. MCP Authorization Specification: OAuth 2.1 with PKCE

### 2.1 Mandatory OAuth 2.1 for Remote Servers

**As of the November 2025 MCP specification revision**, any MCP server accessible over the internet **must** implement OAuth 2.1 with PKCE (Proof Key for Code Exchange). This is not optional.

Key points:
- **PKCE is mandatory for ALL clients** — there is no exemption for confidential clients
- PKCE method **S256** (SHA-256 challenge) is required
- Applies to every remote HTTP-based MCP server exposing tools or resources

**Reference:** [MCP OAuth 2.1 Authentication: Complete Developer Guide 2026 | RockB](https://baeseokjae.github.io/posts/mcp-oauth-authentication-guide-2026/)

### 2.2 PKCE: Why It Matters for Desktop Clients

PKCE defends against authorization code interception by binding each authorization request to a cryptographically secure one-time verifier generated locally by the client.

**Flow:**
1. Client generates a random `code_verifier` (43-128 characters)
2. Client derives `code_challenge = base64url(SHA256(code_verifier))`
3. Client redirects user to authorization server with `code_challenge` and `code_challenge_method=S256`
4. Authorization server stores the challenge and returns an authorization code
5. Client exchanges code + `code_verifier` for tokens
6. Server validates that `SHA256(code_verifier)` matches the stored challenge

**Security:** Even if an attacker intercepts the authorization code, they cannot redeem it without the verifier. This is crucial for Desktop/CLI clients (like Claude Code) where storing long-lived client secrets is impractical.

**Reference:** [MCP OAuth 2.1 Authentication: Complete Developer Guide 2026 | RockB](https://baeseokjae.github.io/posts/mcp-oauth-authentication-guide-2026/)

### 2.3 Audience Binding: Preventing Token Reuse

The MCP spec (2025-06-18 and later) requires:
- **RFC 8707 (audience constraint):** MCP clients must validate that access tokens were issued for them as the intended audience
- Servers must validate the `aud` claim in received tokens
- This prevents token leakage/reuse across unrelated services

**Reference:** [Understanding What is MCP Authentication and How It Works | TrueFoundry](https://www.truefoundry.com/blog/mcp-authentication)

---

## 3. Client Registration and Discovery

### 3.1 Three Client Registration Paths (Priority Order)

As of the **2025-11-25 specification update**, the MCP spec defines three registration methods in priority order:

#### 1. Pre-Registration (Highest Priority)
- Client credentials are manually registered by the MCP server operator
- Zero-friction for end users (no OAuth flow)
- Best for trusted, high-volume integrations (e.g., Official Claude Desktop client)
- Status: **SHOULD** implement if serving official clients

#### 2. Client ID Metadata Documents (CIMD) — NEW DEFAULT
- Client uses a URL as its OAuth `client_id` (e.g., `https://github.com/Anthropic/claude-code`)
- Server fetches the URL to retrieve JSON metadata on-demand
- No pre-registration required; client identity bound to domain
- Status: **SHOULD** implement (new default in Nov 2025 spec)
- **Adopted in MCP via SEP-991**

#### 3. Dynamic Client Registration (RFC 7591) — Legacy
- Clients self-register at a registration endpoint
- Downgraded to **MAY** status (backward compatibility only)
- Older implementations and custom agents may still use this

**Reference:** [What's New In The 2025-11-25 MCP Authorization Spec | Den Delimarsky](https://den.dev/blog/mcp-november-authorization-spec/)

### 3.2 Client ID Metadata Document (CIMD) Details

**What is it?**  
A JSON document hosted at a stable HTTPS URL controlled by the client. The document's URL is used directly as the OAuth `client_id`.

**Example:**
```
client_id = "https://github.com/Anthropic/claude-code"
        ↓
Server fetches: https://github.com/.well-known/oauth-client-metadata.json
        ↓
Returns:
{
  "client_name": "Claude Code",
  "redirect_uris": ["https://claude.ai/oauth/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_method": "none",
  "response_types": ["code"]
}
```

**Advantages:**
- Client identity bound to domain ownership (not just a registration call)
- Eliminates manual pre-provisioning
- Easier for third-party clients to integrate

**Reference:** [Client ID Metadata Documents (CIMD): How OAuth client registration works in MCP — WorkOS](https://workos.com/blog/client-id-metadata-documents-cimd-oauth-client-registration-mcp)

---

## 4. The Seven-Step OAuth Authorization Flow

When a user connects Claude Code (or any MCP client) to a remote MCP server, this flow occurs:

### Step 1: Protected Resource Metadata Discovery
- Client makes **unauthenticated request** to MCP server
- Server returns HTTP **401 Unauthorized** with `WWW-Authenticate` header pointing to `/.well-known/oauth-protected-resource`
- Client retrieves protected resource metadata, containing:
  - `authorization_server` URL (pointing to your OAuth provider)
  - List of required scopes (e.g., `forum:read`, `forum:write`)

### Step 2: Authorization Server Metadata Discovery
- Client fetches `/.well-known/oauth-authorization-server` from the authorization server
- Discovers token endpoint, authorization endpoint, registration endpoint (if needed)
- Follows OpenID Connect Discovery (OIDC 1.0) standard

### Step 3: Dynamic Client Registration (if needed)
- If client is not pre-registered and not using CIMD, it POSTs to the registration endpoint
- Server responds with a `client_id`
- Registration payload includes:
  - `client_name` and `redirect_uris`
  - `grant_types: ["authorization_code", "refresh_token"]`
  - `token_endpoint_auth_method: "none"` (public clients with PKCE)
  - `response_types: ["code"]`

### Step 4: PKCE Credential Generation
- Client generates cryptographically random `code_verifier`
- Client derives `code_challenge` using SHA-256

### Step 5: Authorization Redirect
- Client opens user's browser to authorization endpoint with parameters:
  - `client_id` (or client metadata URL)
  - `code_challenge`, `code_challenge_method=S256`
  - `redirect_uri`, `state` (CSRF protection)
  - `scope` (requested permissions)
- User authenticates and grants consent

### Step 6: Token Exchange
- Authorization server redirects to `redirect_uri` with authorization `code`
- Client exchanges `code` + `code_verifier` + `client_id` for tokens at token endpoint
- Server validates `SHA256(code_verifier)` matches stored challenge
- Returns `access_token` (and optionally `refresh_token`)

### Step 7: Bearer Token Usage
- Client attaches token to every MCP request: `Authorization: Bearer <access_token>`
- MCP server validates token signature, expiry, and audience (`aud`) claim

**Reference:** [MCP OAuth 2.1 Authentication: Complete Developer Guide 2026 | RockB](https://baeseokjae.github.io/posts/mcp-oauth-authentication-guide-2026/)

---

## 5. Discovery Patterns and Metadata Endpoints

### 5.1 Protected Resource Metadata Endpoint

**Path:** `/.well-known/oauth-protected-resource`

**Response (example for Discourse-backed MCP server):**
```json
{
  "authorization_server": "https://discourse.example.com/oauth",
  "resource_documentation_uri": "https://mcp.example.com/docs",
  "resource_scopes": [
    "forum:read",
    "forum:write:own",
    "forum:admin"
  ]
}
```

### 5.2 Authorization Server Metadata Endpoint

**Path:** `/.well-known/oauth-authorization-server`

**Response (example for Discourse OAuth provider):**
```json
{
  "issuer": "https://discourse.example.com",
  "authorization_endpoint": "https://discourse.example.com/oauth/authorize",
  "token_endpoint": "https://discourse.example.com/oauth/token",
  "registration_endpoint": "https://discourse.example.com/oauth/register",
  "scopes_supported": ["forum:read", "forum:write:own", "forum:admin"],
  "code_challenge_methods_supported": ["S256"],
  "grant_types_supported": ["authorization_code", "refresh_token"]
}
```

### 5.3 Auto-Discovery Benefit

This enables **zero-configuration setup** for spec-compliant clients:
1. User provides MCP server URL
2. Client automatically discovers authorization endpoint
3. Client initiates OAuth flow without hardcoded URLs
4. Works for Claude Desktop, ChatGPT integrations, and custom agents

---

## 6. Official SDKs and Implementation

### 6.1 TypeScript SDK (@modelcontextprotocol/sdk)

**The official SDK for building production MCP servers in TypeScript/Node.js.**

- **Installation:** `npm install @modelcontextprotocol/sdk`
- **Transports Supported:** stdio, Streamable HTTP
- **Runtime:** Node.js, Bun, Deno
- **Auth Support:** Built-in OAuth 2.1 helpers and metadata serving

**Basic remote server setup:**
```typescript
import { McpServer, NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk";

const server = new McpServer({
  name: "forum-server",
  version: "1.0.0"
});

// Register tools, resources, prompts
server.tool("create_forum_post", {
  description: "Create a forum post",
  inputSchema: {
    type: "object",
    properties: { /* ... */ }
  },
  execute: async (args) => { /* ... */ }
});

// Connect to Streamable HTTP transport
const transport = new NodeStreamableHTTPServerTransport({
  serverUrl: "https://mcp.example.com/mcp",
  sessionIdGenerator: () => crypto.randomUUID() // or undefined for stateless
});

await server.connect(transport);
```

**OAuth Integration:**
The SDK includes helpers to serve metadata endpoints and validate bearer tokens. Example: attaching OAuth validation middleware.

**References:**
- [MCP TypeScript SDK - Official](https://ts.sdk.modelcontextprotocol.io/)
- [typescript-sdk GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [@modelcontextprotocol/sdk on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)

### 6.2 Cloudflare Workers Implementation

**Cloudflare Workers is a popular edge compute platform for remote MCP servers.**

**Advantages:**
- Runs at Cloudflare's global edge (low latency worldwide)
- OAuth authentication baked in (via Cloudflare's security features)
- Integrates with D1 (relational DB), R2 (object storage), KV (key-value)
- Cost-effective stateless deployments
- WebSocket hibernation available

**Recent Updates (March 2025):**
- Cloudflare launched official remote MCP server support
- Provides tutorials and templates for building MCP servers on Workers
- MCP Bindings server lets you access D1, R2, KV primitives directly

**Implementation approach:**
Cloudflare Workers run JavaScript/TypeScript and can use the official MCP TypeScript SDK with the Streamable HTTP transport. The Worker acts as the MCP endpoint, handling OAuth metadata endpoints and proxying to your Discourse instance.

**References:**
- [How to Deploy an MCP Server on Cloudflare Workers | Fastio](https://fast.io/resources/deploy-mcp-server-cloudflare-workers/)
- [MCP Server on Cloudflare Workers | Daniel Nwaneri](https://dannwaneri.com/mcp-servers/)

### 6.3 Other Framework Options

**Vercel MCP Adapter (Next.js):**
- Allows you to implement an MCP server directly in a Next.js app
- Streamable HTTP transport via API routes
- Good for projects already using Next.js

**Azure Container Apps / Azure Functions (TypeScript):**
- Microsoft provides templates and tutorials for remote MCP servers
- Supports full OAuth flow out of the box

**FastMCP (TypeScript framework):**
- Lightweight framework for building MCP servers
- Includes OAuth configuration helpers
- Simpler than raw SDK for small servers

**References:**
- [Building a Remote MCP Server with Next.js and Vercel's MCP Adapter | Kevin Moechel](https://medium.com/@kevin.moechel/building-a-remote-mcp-server-with-next-js-and-vercels-mcp-adapter-d078b27a9119)
- [Build a TypeScript MCP server using Azure Container Apps | Microsoft Learn](https://learn.microsoft.com/en-us/azure/developer/ai/build-mcp-server-ts)

---

## 7. How Clients Connect to Remote MCP Servers

### 7.1 Claude Code (Local Developer)

**Command:**
```bash
claude mcp add --transport http --scope user my-forum https://mcp.example.com/mcp
```

**Flags:**
- `--transport http` — specifies Streamable HTTP (required for remote)
- `--scope user` — makes server available across all projects (vs. `--scope project` for current project only)
- `my-forum` — friendly name
- `https://mcp.example.com/mcp` — MCP server URL

**After execution:**
1. Claude Code initiates OAuth flow automatically
2. Browser opens to authorization server
3. User authenticates with forum credentials
4. Browser redirects back to Claude Code with token
5. Token is stored securely by Claude Code
6. MCP server is ready to use

**References:**
- [Claude Code MCP Servers: How to Connect, Configure, and Use Them | Builder.io](https://www.builder.io/blog/claude-code-mcp-servers)

### 7.2 Claude.ai (Web Interface)

**Steps:**
1. Navigate to **Settings → Connectors**
2. Click **Add** → **Add custom connector**
3. Enter MCP server URL (e.g., `https://mcp.example.com/mcp`)
4. Follow OAuth authentication dialog
5. Configure tool permissions (which tools Claude can invoke)
6. Save connector

**Important limitation:**
- **Organization-level connectors on Claude.ai currently share a single OAuth token across all organization users**
- This means if two users authenticate, the second login overwrites the first
- **For true per-user access, use Claude Code with `--scope user` instead**

**References:**
- [Connect to remote MCP Servers - Model Context Protocol](https://modelcontextprotocol.io/docs/develop/connect-remote-servers)
- [Third party connectors with remote MCP - Claude.ai Documentation](https://claude.com/docs/connectors/custom/remote-mcp)

### 7.3 Authentication Flow in Client UI

**What the user sees:**
1. Paste MCP server URL into connector dialog
2. Click "Add" → browser opens to authorization endpoint
3. Sees Discourse login form (if not already logged in)
4. Grants permission ("Claude can access your forum account")
5. Redirected back to Claude with confirmation
6. Connector is active and ready

**Behind the scenes:**
- Client retrieves protected resource metadata from your MCP server
- Client fetches authorization server metadata
- Client initiates PKCE flow with browser redirect
- Token is obtained and stored securely in client

---

## 8. Per-User Authentication for Discourse Integration

### 8.1 Architecture Overview

For the VCG Forum MCP project, the architecture flows as follows:

```
Claude Code / Claude.ai
       ↓ (OAuth initiation)
    MCP Server (Streamable HTTP)
       ↓ (Discovers auth server)
    Discourse OAuth Provider
       ↓ (User authenticates, grants permission)
    Back to Claude Code
       ↓ (Token obtained)
    MCP Server ← Bearer token in Authorization header
       ↓ (Validates token, maps to Discourse user)
    Discourse Forum API
       ↓ (Per-user access: reads/writes as that user)
    Forum Data (user-scoped)
```

### 8.2 MCP Server Implementation Requirements

Your MCP server must:

1. **Serve protected resource metadata** at `/.well-known/oauth-protected-resource`
   - Points to `authorization_server` = Discourse OAuth provider URL
   - Lists required scopes (e.g., `forum:read`, `forum:write:own`)

2. **Serve authorization server metadata** (or let Discourse's OAuth provider serve it)
   - If you host it, respond to `/.well-known/oauth-authorization-server`
   - Otherwise, rely on Discourse's built-in OAuth provider metadata

3. **Validate bearer tokens** on every incoming MCP request
   - Extract token from `Authorization: Bearer <token>` header
   - Validate JWT signature, expiry, `aud` claim
   - Map token to Discourse user

4. **Implement MCP tools that act as the authenticated user**
   - Example: `create_post` creates a post attributed to the authenticated user
   - Example: `search_forum` returns results filtered to the user's permissions

### 8.3 Discourse OAuth Configuration

**Steps to configure Discourse as your OAuth provider:**

1. In Discourse Admin panel: **Settings → OAuth**
2. Enable OAuth (if not already enabled)
3. Create an OAuth application:
   - **Client ID:** Generate or assign
   - **Client Secret:** Generate (keep private; NOT embedded in client)
   - **Redirect URI:** `https://mcp.example.com/oauth/callback` or `https://claude.ai/oauth/callback` (depends on deployment)
4. Discourse will expose standard OIDC metadata at:
   - `https://discourse.example.com/.well-known/oauth-authorization-server`

### 8.4 Token Validation in MCP Server

**Pseudo-code for TypeScript:**
```typescript
import jwt from 'jsonwebtoken';

async function validateToken(authHeader: string): Promise<{ discourseUserId: number; scopes: string[] }> {
  const token = authHeader.replace('Bearer ', '');
  
  // Fetch Discourse's public key (JWKS endpoint)
  const jwksUrl = 'https://discourse.example.com/.well-known/jwks.json';
  const publicKey = await fetchPublicKey(jwksUrl);
  
  // Verify JWT
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    audience: 'https://mcp.example.com' // Must match 'aud' claim
  });
  
  return {
    discourseUserId: decoded.sub,
    scopes: decoded.scope.split(' ')
  };
}
```

**References:**
- [Build Remote MCP with Authorization | by Danila Loginov](https://loginov-rocks.medium.com/build-remote-mcp-with-authorization-a2f394c669a8)

---

## 9. Security Considerations

### 9.1 DNS Rebinding Protection

When implementing Streamable HTTP, **Servers MUST validate the Origin header** on all incoming connections to prevent DNS rebinding attacks.

**Implementation:**
```typescript
if (!allowedOrigins.includes(req.headers.origin)) {
  return res.status(403).send('Forbidden');
}
```

**Reference:** [Transports - Model Context Protocol](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)

### 9.2 Localhost Binding

When running locally, servers **SHOULD** bind only to `127.0.0.1` rather than `0.0.0.0`, limiting access to the local machine.

### 9.3 Token Storage

- **Claude Code/Desktop:** Tokens are stored securely in the client's credential store
- **MCP Server:** Never log tokens; validate and immediately discard
- **Discourse:** Ensure Discourse's OAuth tokens are not stored in plaintext

### 9.4 Scope Validation

- Always validate that requested scopes match the MCP server's capabilities
- Never grant scopes the user did not explicitly consent to
- Use least-privilege principle: `forum:read` for read-only, `forum:write:own` for user's own posts

---

## 10. Recommendations for VCG Forum MCP

### 10.1 Recommended Architecture

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Transport** | Streamable HTTP | Only supported remote option; simplifies scaling |
| **Hosting** | Cloudflare Workers or VPS Node.js | Workers = edge performance; VPS = simpler if already self-hosted |
| **SDK** | @modelcontextprotocol/sdk (TypeScript) | Official, production-ready, full OAuth support |
| **Client Registration** | Pre-registration (Claude Code team) + CIMD (third-party clients) | Zero friction for internal use; CIMD for third-party integrations |
| **OAuth Provider** | Discourse's built-in OAuth provider | Eliminates need for separate auth server; per-user tokens direct from forum |
| **Scope Design** | `forum:read`, `forum:write:own`, `forum:write:all` (admin) | Matches Discourse's permission model |

### 10.2 Implementation Steps

1. **Build MCP server with TypeScript SDK**
   - Expose tools: `create_post`, `update_post`, `search_forum`, `get_notifications`, etc.
   - Serve metadata endpoints (`/.well-known/oauth-protected-resource`)
   - Validate bearer tokens from Discourse

2. **Configure Discourse OAuth**
   - Create OAuth application in Discourse Admin
   - Set redirect URI to `https://mcp.example.com/oauth/callback` (or localhost for testing)
   - Note Client ID and Client Secret

3. **Deploy to Cloudflare Workers or VPS**
   - If Workers: Use wrangler CLI for deployment
   - If VPS: Run Node.js server with systemd or Docker
   - Both approaches: ensure HTTPS certificate is valid

4. **Test with Claude Code**
   ```bash
   claude mcp add --transport http --scope user forum https://mcp.example.com/mcp
   ```

5. **Verify per-user access**
   - Confirm that two different users see different forum data
   - Confirm that posts are created under the correct user account

### 10.3 Version Strategy

- **v0.1.0 (MVP):** Read-only access (`forum:read`), search, notifications
- **v0.2.0:** Write access (`forum:write:own`), create/edit own posts
- **v0.3.0:** Admin tools (if needed)

### 10.4 Testing Strategy

- **Unit tests:** Token validation, metadata endpoint responses
- **Integration tests:** Full OAuth flow with Discourse (requires test forum instance)
- **User acceptance:** Test with Claude Code and Claude.ai on dev server

---

## 11. Key Decision Points

### 11.1 Stateful vs. Stateless Sessions?

**Decision:** Stateless (default)

**Rationale:**
- Removes session affinity requirement
- Simplifies load balancing
- 2026-07-28 RC makes stateless the standard
- Matches Cloudflare Workers' serverless model

**Implementation:** Omit `sessionIdGenerator` from transport config or set to `undefined`.

### 11.2 Pre-Host on Cloudflare or VPS?

**If self-hosting Discourse on VPS already:**
- **Easier deployment:** Node.js server on VPS (reuses existing infrastructure)
- **Simpler firewall:** Single MCP endpoint on same server
- **Risk:** Single point of failure; limited geographic reach

**If considering external hosting:**
- **Better performance:** Cloudflare Workers runs at edge globally
- **Higher availability:** Cloudflare's global network
- **Operational complexity:** Separate account; requires DNS configuration

**Recommendation:** Start on VPS (simpler); migrate to Cloudflare Workers if scaling becomes necessary.

### 11.3 How to Authenticate Claude Code Users?

**Option A (Recommended for org internal use):**
- Pre-register the official Claude Code app as an OAuth client in Discourse
- Users add the server with `claude mcp add --transport http forum https://mcp.example.com/mcp`
- They're redirected to Discourse login once, authenticated forever

**Option B (For third-party clients):**
- Use CIMD client registration
- Support dynamic client registration as fallback
- Higher friction, but works for any MCP client

**Recommendation:** Option A for org launch; add Option B if opening to the public later.

---

## 12. References and Sources

### Specification & Protocol
- [Transports - Model Context Protocol Specification (2025-03-26)](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)
- [The 2026-07-28 MCP Specification Release Candidate](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [What's New In The 2025-11-25 MCP Authorization Spec | Den Delimarsky](https://den.dev/blog/mcp-november-authorization-spec/)

### OAuth & Authentication
- [MCP OAuth 2.1 Authentication: Complete Developer Guide 2026 | RockB](https://baeseokjae.github.io/posts/mcp-oauth-authentication-guide-2026/)
- [Understanding What is MCP Authentication and How It Works | TrueFoundry](https://www.truefoundry.com/blog/mcp-authentication)
- [Client ID Metadata Documents (CIMD): How OAuth client registration works in MCP — WorkOS](https://workos.com/blog/client-id-metadata-documents-cimd-oauth-client-registration-mcp)

### SDKs & Implementation
- [MCP TypeScript SDK Documentation](https://ts.sdk.modelcontextprotocol.io/)
- [modelcontextprotocol/typescript-sdk GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [@modelcontextprotocol/sdk on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [How to Deploy an MCP Server on Cloudflare Workers | Fastio](https://fast.io/resources/deploy-mcp-server-cloudflare-workers/)

### Client Integration
- [Connect to remote MCP Servers - Model Context Protocol](https://modelcontextprotocol.io/docs/develop/connect-remote-servers)
- [Third party connectors with remote MCP - Claude.ai Documentation](https://claude.com/docs/connectors/custom/remote-mcp)
- [Claude Code MCP Servers: How to Connect, Configure, and Use Them | Builder.io](https://www.builder.io/blog/claude-code-mcp-servers)

### Best Practices
- [Build Remote MCP with Authorization | by Danila Loginov](https://loginov-rocks.medium.com/build-remote-mcp-with-authorization-a2f394c669a8)
- [Developing an MCP Scenario with TypeScript: A production-ready reference implementation](https://tmaestrini.github.io/topics/developing-an-mcp-scenario-with-typescript-a-production-ready-reference-implementation)

---

## Appendix: Implementation Checklist

- [ ] **Phase 1: Planning**
  - [ ] Define MCP tools (create_post, search, etc.)
  - [ ] Define OAuth scopes (forum:read, forum:write:own)
  - [ ] Choose hosting (VPS vs. Cloudflare Workers)
  - [ ] Set up Discourse OAuth application

- [ ] **Phase 2: Development**
  - [ ] Initialize TypeScript project with `@modelcontextprotocol/sdk`
  - [ ] Implement MCP tools with Discourse API calls
  - [ ] Serve `/.well-known/oauth-protected-resource` endpoint
  - [ ] Implement token validation middleware
  - [ ] Set up Streamable HTTP transport

- [ ] **Phase 3: Testing**
  - [ ] Test token validation with real Discourse tokens
  - [ ] Test OAuth flow with Claude Code CLI
  - [ ] Verify per-user data isolation
  - [ ] Load test with multiple concurrent users

- [ ] **Phase 4: Deployment**
  - [ ] Deploy to VPS or Cloudflare Workers
  - [ ] Configure DNS and HTTPS
  - [ ] Set up monitoring and logging
  - [ ] Document for team

- [ ] **Phase 5: Launch**
  - [ ] Distribute `mcp add --transport http` instructions
  - [ ] Train users on connecting Claude Code
  - [ ] Gather feedback and iterate

---

**Research completed:** 2026-07-21  
**Confidence:** High (all findings sourced from official MCP spec, SDK docs, and recent blog posts)  
**Status:** Ready for architecture design
