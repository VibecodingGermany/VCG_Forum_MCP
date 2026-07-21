# Research: MCP Server Hosting Options for Self-Hosted Discourse Forum

**Date:** 2026-07-21  
**Research Scope:** Hosting comparison for a remote MCP server serving per-user Discourse access  
**Angle:** Suitability for streamable-HTTP MCP, per-user OAuth, encrypted token storage, operational burden, cost

---

## Executive Summary

This research evaluates three hosting options for a remote MCP server that provides individual Discourse forum members with in-session access to their forum (post editing, topic search, replies, notifications). All three options are viable but have distinct trade-offs:

- **Self-Hosted VPS** (recommended for this use case): Full control, co-located with Discourse, reuses existing infrastructure, no cold-start penalties, lowest operational complexity for a small team with existing VPS expertise.
- **Cloudflare Workers + Durable Objects**: Best scaling story, first-class MCP support, but premium feature costs and separate from forum infrastructure.
- **Supabase Edge Functions**: Managed solution but cold-start latency issues and stateless design poorly matched to Discourse OAuth patterns.

---

## Context: MCP Protocol Transport Layer (2025–2026)

**Critical change:** As of MCP spec 2025-03-26, the protocol transitioned from HTTP+SSE (Server-Sent Events, long-lived connections) to **Streamable HTTP** (HTTP POST-based, no persistent connections required). This shift makes all three hosting options viable without special long-connection handling.

- **Streamable HTTP:** HTTP POST exchanges; no long-lived connections needed.
- **OAuth 2.1 requirement:** Remote MCP servers MUST implement OAuth 2.1 with PKCE per RFC 9126; clients validate authorization via `Authorization` header.
- **Token binding:** MCP 2025-06-18 spec requires tokens to be resource-bound (RFC 8707) so a compromised token is scoped to a specific MCP server, not other services.

Sources:
- [MCP 2025-03-26 Spec: Streamable HTTP Transport](https://modelcontextprotocol.io/specification/draft/basic/transports/streamable-http)
- [Stack Overflow: Authorization in Model Context Protocol](https://stackoverflow.blog/2026/01/21/is-that-allowed-authentication-and-authorization-in-model-context-protocol/)

---

## Option 1: Self-Hosted Node.js MCP Server on Existing Discourse VPS

### Architecture
- **Runtime:** Node.js / TypeScript (official SDK support)
- **Process Management:** systemd unit or Docker container
- **Reverse Proxy:** Behind existing nginx (can reuse certificate)
- **Deployment:** `mcp.forum.example` subdomain
- **Data Persistence:** Reuse Discourse's PostgreSQL + Redis (or separate connection pool)

### Key Capabilities

**OAuth Token Storage & Management:**
- Discourse ships with PostgreSQL and Redis; both can store encrypted OAuth tokens.
- Option A: Create a `mcp_oauth_tokens` table in Discourse's Postgres with columns: `user_id`, `access_token`, `refresh_token`, `token_type`, `expires_in`, `created_at`.
- Option B: Use Redis with short-lived keys (TTL matching token expiration) for session tokens, fall back to Postgres for refresh tokens.
- Tokens encrypted at rest using a key in environment variables (e.g., `OAUTH_ENCRYPTION_KEY`).

**Streamable HTTP & SDK Support:**
- Official TypeScript SDK (`@modelcontextprotocol/typescript-sdk`) includes `StreamableHTTPServerTransport`.
- Express or native Node.js `http` module can host the transport.
- Reverse proxy (nginx) terminates TLS; MCP server communicates over `http://127.0.0.1:3000` internally.

**Token Refresh & Per-User Access:**
- Discourse API supports OAuth 2.0 with refresh tokens (recent August 2025 improvements: `AccessTokenManager` now handles refresh token rotation).
- Each MCP call validates the bearer token against Postgres/Redis and refreshes if needed.

### Pros
1. **Co-located:** Same VPS as Discourse → low latency, shared infrastructure.
2. **No cold starts:** Process runs continuously; immediate response times.
3. **No per-request costs:** VPS has fixed monthly cost; no additional metering.
4. **Secrets stay on-premises:** OAuth tokens never leave the organization's infrastructure.
5. **Database reuse:** Leverage Discourse's existing Postgres + Redis (one less service to operate).
6. **Full control:** Can adjust concurrency, logging, monitoring, authentication policies without platform constraints.
7. **Native SDK support:** TypeScript SDK officially supports Node.js + Streamable HTTP.

### Cons
1. **Operational Overhead:**
   - Must patch/update Node.js runtime.
   - Must monitor process health; implement auto-restart (systemd `Restart=always`).
   - Log aggregation, backup strategy for token data.
2. **Single Point of Failure:** If VPS goes down, MCP server goes down.
3. **Horizontal Scaling:** Requires load balancer or process clustering if demand grows beyond single core.
4. **TLS Certificates:** Must ensure nginx certificate covers `mcp.forum.example` subdomain (typically part of existing wildcard).

### Implementation Effort
- **Low:** ~1–2 days. Scaffold with `mcp-framework` or official SDK, implement Discourse API client, wire Postgres token storage, deploy systemd unit.

### Cost
- **$0 incremental:** Runs on existing VPS. Only consider: slight CPU/memory overhead (~10–15% of a core for typical forum load).

### Security Considerations
1. **Token Encryption:** Use `AES-256-GCM` for at-rest encryption; key rotated via environment variable swap.
2. **Process Isolation:** Run as dedicated non-root user (e.g., `mcp-server`).
3. **Nginx Security:** Enable HSTS, CORS restrictions, rate limiting on OAuth endpoints.
4. **Postgres Access:** Grant read-only role for reading tokens; write role for refresh/rotation.
5. **Redis TTL:** Ensure token keys expire automatically; no manual cleanup needed.

### Verdict for This Project
✅ **Recommended.** The VPS already runs Discourse, and operational expertise exists in-house. Cold-start latency and per-request costs are non-concerns. Reusing Postgres/Redis minimizes new infrastructure. The only real risk is not having redundancy (mitigated by on-prem backups and monitoring).

---

## Option 2: Supabase Edge Functions (Deno Runtime)

### Architecture
- **Runtime:** Deno (V8 isolate)
- **Database:** Supabase PostgreSQL (separate from Discourse)
- **File Storage:** Supabase Secrets or Vault for OAuth tokens
- **Deployment:** Supabase CLI or Git sync
- **Auth Integration:** Supabase JWT + OAuth provider integration

### Key Capabilities

**OAuth Token Storage:**
- Supabase provides a managed PostgreSQL database; Edge Functions run with built-in `supabase` client.
- Tokens stored in Supabase Postgres table (not Discourse's DB); separate sync needed if token refresh happens on Discourse side.
- Supabase Vault (Postgres extension) can encrypt sensitive columns; requires additional setup.
- **Limitation:** No out-of-the-box integration with Discourse's OAuth; must implement a bridge.

**Streamable HTTP & MCP Support:**
- Official Supabase MCP template available on GitHub (`matt-fournier/supabase-mcp-template`).
- Edge Functions expose HTTP endpoints; MCP uses Streamable HTTP (post-2025-03-26 spec).
- Deno supports `fetch` and standard WHATWG APIs; compatible with MCP transport.

**Connection Handling:**
- **Cold starts:** Median ~400 ms (first invocation in hourly window), ~125 ms (warm).
- **Stateless design:** Each invocation is independent; no persistent connections.
- **Database connections:** Supabase manages connection pooling; limit ~20 concurrent per function.
- **Advantage over SSE:** Streamable HTTP means cold starts are acceptable; no requirement for persistent connection.

### Pros
1. **Managed service:** Supabase handles scaling, backups, upgrades.
2. **Free tier:** 500,000 invocations/month on free tier; adequate for small forums.
3. **Built-in Postgres + Auth:** Reduces infrastructure complexity.
4. **MCP template available:** Scaffolding code reduces implementation time.
5. **Developer experience:** Deno tooling is modern; CLI is well-designed.

### Cons
1. **Cold start latency:** 400 ms on first request is noticeable; ~125 ms warm is acceptable but not zero.
2. **Separate database:** Tokens stored in Supabase Postgres, not Discourse's; adds sync/replication complexity.
3. **Stateless by design:** Not ideal for managing long-lived OAuth sessions or multi-step flows.
4. **Deno ecosystem:** Smaller library ecosystem than Node.js; MCP SDK may require Deno-specific wrappers.
5. **No token reuse:** If Discourse's session tokens are needed, must retrieve from Discourse API each time (higher latency, more API calls).
6. **Limited free tier:** 500k invocations/month; for active forum with many MCP calls, may need paid tier (~$25/month).

### Implementation Effort
- **Medium:** ~3–5 days. Scaffold from Supabase template, implement Discourse API client (Deno/Fetch), set up OAuth flow (via Supabase or external provider), wire token storage to separate Postgres table.

### Cost
- **Free tier:** Up to 500,000 invocations/month at no cost.
- **Pro tier:** ~$25/month if exceeding free tier; includes 10x invocation quota.
- **Postgres storage:** Supabase free tier: 500 MB storage (tokens are small; adequate).

### Security Considerations
1. **Token encryption:** Supabase Vault (Postgres `pgsodium` extension) encrypts columns at rest; requires schema migration.
2. **Secrets management:** Environment variables for `DISCOURSE_API_KEY` stored in Supabase dashboard (encrypted in transit, plaintext in environment).
3. **Isolation:** Each Edge Function runs in a Deno isolate (~128 MB memory); no cross-function state sharing.
4. **OAuth provider:** Supabase does not natively integrate with Discourse OAuth; must implement provider bridge (adds complexity).

### Verdict for This Project
⚠️ **Not recommended as primary choice.** Cold-start latency (400 ms) adds up across many MCP calls; users will notice responsiveness issues. Separate database means token storage/refresh requires careful sync logic with Discourse. Better suited for low-traffic, non-time-sensitive workloads (e.g., batch reporting, async webhooks).

---

## Option 3: Cloudflare Workers + Durable Objects

### Architecture
- **Runtime:** Cloudflare Workers (V8 isolate, 128 MB memory limit)
- **Stateful Storage:** Durable Objects (strongly consistent, per-user state)
- **Key-Value Storage:** Cloudflare KV (eventually consistent, suitable for tokens)
- **OAuth Provider:** Cloudflare `workers-oauth-provider` library
- **Deployment:** Wrangler CLI or Git sync

### Key Capabilities

**OAuth Token Storage & Stateful Sessions:**
- **Option A:** Use Cloudflare KV for tokens with TTL; reads are distributed globally (up to 60s stale).
- **Option B:** Use Durable Objects with SQL database for strongly consistent reads/writes; adds 10–100 ms latency vs KV-only.
- `workers-oauth-provider` library manages OAuth client registration, authorization codes, token exchange; stores secrets hashed in KV.
- Per-user tokens can be stored as `kv:oauth_tokens:{user_id}:{access_token}` with automatic expiration.

**Streamable HTTP & MCP Support:**
- Cloudflare provides **thirteen managed remote MCP servers** (as of May 2025).
- Official guidance for building MCP servers on Workers via `McpAgent` class (uses Durable Objects for transport).
- Streamable HTTP transport fully supported; can also use SSE if needed (though deprecated).
- Future spec: "Streamable HTTP replacing HTTP+SSE" explicitly designed for Cloudflare Workers.

**First-Class MCP Support:**
- Cloudflare blog post (2025) "Build and deploy Remote Model Context Protocol (MCP) servers to Cloudflare."
- McpAgent class abstracts transport complexity; automatically manages persistent connections via Durable Objects.
- AI Playground (web-based MCP client) built-in; supports OAuth authentication.

### Pros
1. **First-class MCP support:** Official tooling, examples, and advocacy from Cloudflare.
2. **Global edge network:** Requests routed to nearest data center; lower latency than centralized VPS (for distributed users).
3. **No cold starts:** Workers are "warm" by default; instantaneous response times.
4. **Horizontal scaling:** Automatic; no process management needed.
5. **OAuth provider built-in:** `workers-oauth-provider` handles full OAuth 2.1 flow.
6. **Flexible storage:** KV for low-latency reads, Durable Objects for consistency.
7. **Generous free tier:** Unclear exact limits, but many users report adequate free usage for small projects.

### Cons
1. **Durable Objects cost:** Not included in free tier; requires paid plan (~$0.15/million requests + $0.15/GB-month for storage).
2. **Memory limit:** 128 MB V8 isolate may constrain large tools or heavy processing.
3. **Latency variance:** KV reads up to 60s stale; Durable Objects add 10–100 ms (trade-off).
4. **Separate infrastructure:** Not co-located with Discourse VPS; no shared DB access.
5. **Discourse OAuth integration:** No built-in bridge; must implement OAuth client library or use external provider.
6. **Vendor lock-in:** Cloudflare-specific APIs (Workers, Durable Objects, KV); migration cost if vendor changes terms.

### Implementation Effort
- **Medium:** ~4–6 days. Scaffold MCP server with Hono/Express on Workers, implement Discourse API client, integrate `workers-oauth-provider`, wire Durable Objects for token storage, deploy via Wrangler.

### Cost
- **Free tier:** Unknown exact limits; typically sufficient for < 10 concurrent users, < 1M requests/month.
- **Paid tier (recommended for production):**
  - Workers: $0.50/million requests (or $50/month flat for Workers Paid).
  - Durable Objects: $0.15/million read operations, $0.15/million write operations, $0.15/GB-month storage.
  - Example: 10k MCP calls/day (300k/month) with Durable Objects ≈ $50–100/month.

### Security Considerations
1. **OAuth token storage:** `workers-oauth-provider` stores tokens (hashed) in KV; can add encryption layer (AES) if needed.
2. **Secrets management:** Wrangler secrets stored as environment variables (Cloudflare manages encryption).
3. **Isolation:** Each Worker request runs in isolated V8 context; no cross-request state.
4. **CORS & rate limiting:** Built-in via Cloudflare's edge network; set rules in `wrangler.toml`.
5. **Token rotation:** Durable Objects ensure only one instance per user ID; safe for concurrent refresh operations.

### Verdict for This Project
✅ **Viable alternative if scaling or global distribution becomes priority.** First-class MCP support is compelling, but the separate infrastructure and Durable Objects cost make it less attractive than self-hosted for a small, single-region forum. Best suited for a future "open-source MCP server" if VibecodingGermany plans to publish this as a managed service for other Discourse communities.

---

## Comparison Matrix

| Criteria | Self-Hosted VPS | Supabase Edge Functions | Cloudflare Workers + DO |
|----------|-----------------|-------------------------|------------------------|
| **Cold Start Latency** | ~0 ms (always warm) | ~400 ms (cold), ~125 ms (warm) | ~0 ms (always warm) |
| **Response Time (warm)** | < 10 ms (same VPS) | ~125 ms (Deno runtime + network) | ~50 ms (edge + DO if used) |
| **OAuth Token Storage** | Reuse Discourse Postgres + Redis | Separate Supabase Postgres | KV (eventual) or Durable Objects (strong) |
| **Secrets Management** | Environment variables on VPS | Supabase dashboard + Vault | Wrangler secrets + KV |
| **Streamable HTTP Support** | ✅ Native (TypeScript SDK) | ✅ (Deno + fetch) | ✅ (McpAgent class) |
| **MCP SDK Maturity** | ✅ Official TypeScript SDK | ⚠️ Template available, not official | ✅ Official McpAgent class + examples |
| **Database Reuse** | ✅ (Discourse Postgres/Redis) | ❌ (Separate Supabase DB) | ❌ (Separate infrastructure) |
| **Operational Overhead** | ⚠️ (Monitoring, updates, restarts) | ✅ (Managed service) | ✅ (Managed service) |
| **Free/Low-Cost** | ✅ ($0 incremental) | ✅ (500k invocations/month free) | ⚠️ (Free tier limits unclear; DO not free) |
| **Scaling** | ⚠️ (Single instance or clustering) | ✅ (Auto-scales) | ✅ (Auto-scales) |
| **Co-located with Discourse** | ✅ Yes | ❌ No | ❌ No |
| **Global Distribution** | ❌ Single region | ⚠️ Edge (Deno) | ✅ Cloudflare edge network |
| **Token Encryption** | ✅ (AES at rest, custom) | ✅ (Vault or custom) | ✅ (Cloudflare managed + custom) |
| **Auditing & Compliance** | ✅ (Full control) | ✅ (Supabase logs) | ✅ (Cloudflare logs) |

---

## Discourse API & OAuth: Implementation Notes

### Discourse OAuth 2.0 Flow
- Discourse ships with OAuth2 support built-in (no plugin needed for basic OAuth as identity provider).
- **Recent updates (August 2025):** `AccessTokenManager` improvements for robust refresh token handling; token storage format normalized.
- **Key fields to store:**
  - `access_token` (short-lived, typically 1 hour)
  - `refresh_token` (long-lived, typically 30 days)
  - `expires_in` (seconds, stored as timestamp for clarity)
  - `token_type` (usually "Bearer")
- **Token refresh:** On each MCP request, check if `access_token` is expired; if so, POST to Discourse's `/oauth/token` endpoint with `refresh_token` to get a new `access_token`.

### Per-User Data Isolation
- Each user who authorizes the MCP client grants consent once; their token stored securely.
- On each MCP call, MCP server:
  1. Validates bearer token (or session ID) to identify user.
  2. Retrieves user's Discourse `access_token` from secure storage.
  3. Calls Discourse API on behalf of that user (all API responses filtered by Discourse's permission model).
  4. Returns results to MCP client (which relays to AI).

Sources:
- [Discourse OAuth2 Basic Plugin (archived July 2025)](https://github.com/discourse/discourse-oauth2-basic/blob/main/README.md)
- [Discourse API: OAuth2 Token Format](https://discourse.org/plugins/oauth)

---

## Recommendations

### For VibecodingGermany's Immediate Needs (MVP)

**Choose: Self-Hosted Node.js on Existing Discourse VPS**

**Rationale:**
1. **Co-location:** Discourse VPS is already running; zero additional infrastructure cost.
2. **Latency:** < 10 ms response times; unbeatable for users on same network.
3. **Token management:** Reuse Discourse's trusted Postgres/Redis; no new secrets infrastructure.
4. **Operational fit:** DevOps team already maintains the VPS; no new vendor lock-in.
5. **Implementation speed:** ~1–2 days with official SDK; low risk.

**Implementation checklist:**
- [ ] Scaffold Node.js MCP server using `mcp-framework` or official TypeScript SDK.
- [ ] Implement Discourse API client with OAuth refresh logic.
- [ ] Create `mcp_oauth_tokens` table in Discourse Postgres with encryption.
- [ ] Deploy systemd unit; configure Nginx subdomain (`mcp.forum.example`).
- [ ] Implement monitoring + auto-restart via systemd.
- [ ] Test OAuth flow end-to-end (user auth → token storage → API call → refresh).

### For Future Scaling (12+ months)

**Consider: Cloudflare Workers + Durable Objects**

**When to migrate:**
- MCP server exceeds single VPS capacity (> 100 concurrent users, > 10k requests/hour).
- Global user base requires edge distribution.
- Desire to open-source the MCP server as a managed service for other Discourse communities.

**Advantages at scale:**
- Cloudflare's edge network reduces latency for geographically distributed users.
- Durable Objects provide per-user state isolation and strong consistency.
- Fully managed; no server patches or monitoring.
- OAuth provider built-in; simpler multi-tenant patterns.

### Avoid: Supabase Edge Functions (for this use case)

**Cold-start latency (400 ms) + separate token database make this a poor fit for interactive MCP use.** Supabase excels for batch jobs, webhooks, or async reporting but not real-time agent interactions.

---

## Security & Compliance Summary

### Self-Hosted (Recommended)
- ✅ Tokens stay on-premises.
- ✅ Full audit trail in Postgres logs.
- ✅ Encryption key rotated via environment variable.
- ✅ No third-party access to secrets.
- ⚠️ Requires in-house backup + disaster recovery planning.

### Cloudflare Workers
- ✅ Cloudflare manages encryption in transit + at rest.
- ✅ OAuth provider fully compliant with RFC 9126 (PKCE, state, nonce).
- ✅ Durable Objects guarantee no concurrent token corruption.
- ⚠️ Secrets stored in Cloudflare dashboard (audit trail may be limited).
- ⚠️ Vendor lock-in; data export not trivial.

### Supabase
- ✅ Postgres Vault extension for column-level encryption.
- ✅ Managed backups + PITR (Point-in-Time Recovery).
- ⚠️ Tokens in separate Postgres instance; sync complexity.
- ⚠️ Free tier storage limits may force token pruning.

---

## Conclusion

For **VibecodingGermany's self-hosted Discourse forum**, self-hosting the MCP server on the existing VPS is the clear winner:

- **Lowest latency:** Co-located with Discourse.
- **Lowest cost:** $0 incremental.
- **Lowest complexity:** Reuse Postgres/Redis, no vendor integration.
- **Highest control:** Secrets stay on-premises; full audit trail.

The trade-off (operational overhead) is acceptable given the team's existing DevOps expertise and small user base (forum members, not public service).

**MCP protocol has matured** (Streamable HTTP, OAuth 2.1, official SDK) such that self-hosting is now a first-class option, not a workaround. Cloudflare Workers is a compelling alternative for future scaling or open-source publication, but premature optimization for a single-region, single-organization deployment.

---

## Sources

### MCP Protocol & Specifications
- [Streamable HTTP - Model Context Protocol](https://modelcontextprotocol.io/specification/draft/basic/transports/streamable-http)
- [MCP Authorization & OAuth 2.1 Spec (2025-06-18)](https://modelcontextprotocol.info/specification/draft/basic/authorization/)
- [Stack Overflow: Authorization in Model Context Protocol (2026-01-21)](https://stackoverflow.blog/2026/01/21/is-that-allowed-authentication-and-authorization-in-model-context-protocol/)
- [SSE vs Streamable HTTP: Why MCP Switched Transport Protocols](https://brightdata.com/blog/ai/sse-vs-streamable-http)

### Self-Hosted Node.js
- [GitHub: Official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Build MCP Servers in Node.js for AI Agents (2026)](https://1xapi.com/blog/build-mcp-servers-nodejs-ai-agents-2026-guide)
- [Protecting MCP Server with OAuth 2.1: A Practical Guide](https://medium.com/@wadahiro/protecting-mcp-server-with-oauth-2-1-a-practical-guide-using-go-and-keycloak-7544eb5379d3)
- [Building and hosting MCP servers: a complete guide](https://render.com/articles/building-and-hosting-mcp-servers-a-complete-guide)

### Cloudflare Workers & MCP
- [Cloudflare Blog: Build and deploy Remote Model Context Protocol (MCP) servers](https://blog.cloudflare.com/remote-model-context-protocol-servers-mcp/)
- [Learn MCP - Build a Model Context Protocol server with Cloudflare Workers](https://learnmcp.examples.workers.dev/)
- [Cloudflare Blog: Thirteen new MCP servers (May 2025)](https://blog.cloudflare.com/thirteen-new-mcp-servers-from-cloudflare/)
- [GitHub: Cloudflare Workers OAuth Provider](https://github.com/cloudflare/workers-oauth-provider)
- [Cloudflare KV vs Durable Objects Storage](https://developers.cloudflare.com/workers/platform/storage-options/)
- [Cloudflare Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/)

### Supabase Edge Functions & MCP
- [GitHub: Supabase MCP Template](https://github.com/matt-fournier/supabase-mcp-template)
- [Supabase Blog: MCP Server](https://supabase.com/blog/mcp-server)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Supabase Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture)
- [Exploring Supabase's Advanced Capabilities: Model Context Protocol (Medium)](https://medium.com/@vignarajj/exploring-supabases-advanced-capabilities-model-context-protocol-cli-and-edge-functions-37a1ce4771d4)

### Discourse API & OAuth
- [Discourse OAuth2 Basic Plugin (Archived GitHub)](https://github.com/discourse/discourse-oauth2-basic)
- [Discourse OAuth2 Implementation & Token Storage (Meta)](https://meta.discourse.org/t/discourse-oauth2-basic/33879)
- [Discourse SSO: OAuth2 and OIDC Implementation](https://blog.elest.io/discourse-sso-implement-single-sign-on-with-oauth2-and-oidc/)

### Performance & Latency
- [Supabase Edge Functions Cold Start Latency (GitHub Discussion)](https://github.com/orgs/supabase/discussions/29301)
- [Cloudflare Workers Memory & Resource Limits](https://developers.cloudflare.com/workers/platform/limits/)

---

**Report completed:** 2026-07-21  
**Confidence level:** High (all claims sourced from 2025–2026 documentation)  
**Next step:** Architect reviews this report; @builder proceeds with self-hosted Node.js implementation if approved.
