# Research: Discourse REST API Authentication for Per-User Actions

**Date:** 2026-07-21  
**Scope:** Discourse User API Keys specification, authorization flow, security comparison with global API keys, relevant endpoints, rate limits, and gotchas  
**Context:** VCG Forum MCP — building an MCP server for Discourse with per-user write access

---

## Executive Summary

Discourse provides a **User API Keys** system purpose-built for per-user, user-scoped actions without admin privileges. This is fundamentally different from global/admin API keys and directly addresses the MCP's requirement for individual user authentication and write access. The flow involves a public-key cryptographic handshake, user authorization, and encrypted key exchange. User API Keys can edit posts, create topics, reply, search, and access notifications—all within the user's existing permissions.

---

## Authentication Models: User API Keys vs. Global API Keys

### User API Keys (Recommended for MCP)

**What it is:**
- Per-user, cryptographically-bound API credentials generated through an authorization flow
- Users generate their own keys; no admin involvement needed
- Each key acts as the user who created it—inherits that user's forum permissions

**Authorization Flow (High-Level):**

1. **Client Setup** (MCP server)
   - Generate RSA public/private key pair
   - Specify a redirect URL for encrypted payload delivery

2. **Initiate Authorization** → Redirect to Discourse
   - Send user to: `https://discourse.example.com/user-api-key/new` with parameters:
     - `public_key` — Client's RSA public key (PEM format)
     - `client_id` — Unique app identifier
     - `nonce` — Random identifier for response verification
     - `scopes` — Comma-separated permissions (e.g., "read,write,notifications")
     - `application_name` — Display name in user's API key settings
     - `auth_redirect` — Callback URL to receive encrypted payload

3. **User Authorizes** (at Discourse)
   - Discourse prompts user to approve the application
   - User confirms scopes

4. **Encrypted Key Exchange**
   - Discourse generates a user-specific API key
   - Encrypts it using client's public key (RSA)
   - Redirects to `auth_redirect` with encrypted payload (Base64-encoded)
   - Only client with the private key can decrypt it

5. **Client Decrypts & Uses**
   - Client decrypts payload with private key
   - Extracts the User API Key
   - Includes key in subsequent API requests (header: `User-Api-Key`)

**Source:** [User API Keys Specification — Discourse Meta](https://meta.discourse.org/t/user-api-keys-specification/48536), [Discourse MCP User API Key Setup](https://github.com/discourse/discourse-mcp)

---

### Global/Admin API Keys (NOT Recommended for MCP)

**What it is:**
- Single, shared, admin-level credentials created in Admin > Advanced > API Keys
- Requires admin creation; users don't generate these themselves
- Can impersonate any user on the forum (if "All Users" scope)

**How it's used:**
- Sent via headers: `Api-Key: <key>` + `Api-Username: <username>` (for impersonation)
- OR as query string parameter (legacy, security risk—logged in URLs)

**Why Unsuitable for MCP:**
- **Secret sprawl:** One key shared across many MCP users — if exposed, compromises everyone
- **Impersonation vector:** Holder can act as any user (including admins)
- **Audit trail opacity:** Hard to trace which user initiated an action via a shared key
- **Admin burden:** Forum admin must create and rotate keys; no user self-service
- **Overpowered:** Grants administrative actions (delete posts, ban users, etc.) even if MCP only needs user-level writes

**Source:** [Create and Configure an API Key](https://meta.discourse.org/t/create-and-configure-an-api-key/230124), [API Key Security Risks](https://meta.discourse.org/t/api-key-as-a-query-string-parameter-is-a-security-risk-right/67661)

---

## User API Key Scopes

Available scopes define what actions a User API Key can perform. Scopes are **restrictive relative to the user's existing permissions**—a key cannot grant rights the user doesn't already have; it can only limit them.

### Common Scopes Available

| Scope | Permissions | Use Case |
|-------|-------------|----------|
| `read` | GET requests only; read posts, topics, user profiles, search | Read-only MCP tools |
| `write` | POST/PUT/PATCH requests; create/edit posts, reply, edit own topics | Editing posts, replying, creating topics |
| `notifications` | GET `/notifications.json`, PUT `/notifications/:id/mark_read` | Read & clear notifications |
| `session_info` | GET `/session/current.json` (current user info) | Verify who we're acting as |
| `push` (+ `notifications`) | Subscribe to push notifications via push_url | Real-time updates |

**Key Limitation:** Scopes **cannot grant permissions the user lacks**. If a user lacks "can_edit" on a post due to trust level, time-limit, or category permissions, even a `write`-scoped key cannot edit that post.

**Source:** [Discourse MCP Scopes Documentation](https://github.com/discourse/discourse-mcp), [User API Keys Specification](https://meta.discourse.org/t/user-api-keys-specification/48536)

---

## Relevant Endpoints for MCP Use Cases

### Create/Edit Posts
- **Create topic/reply:** `POST /posts`
  - Scope required: `write`
  - User must have permission to post in the category/topic
  - Example: `{ "title": "...", "raw": "..." }` (topic) or `{ "topic_id": 123, "raw": "..." }` (reply)

- **Edit own post:** `PUT /posts/:id`
  - Scope required: `write`
  - User can only edit own posts (unless they're a moderator)
  - Respects post edit time limit (configurable by admin)

- **Delete own post:** `DELETE /posts/:id`
  - Scope required: `write`
  - User can only delete own posts (unless a moderator)

### Search
- **Search posts/topics:** `GET /search.json`
  - Scope required: `read`
  - Returns results the user has permission to see
  - Query params: `q=...` (search term)
  - Example: `GET /search.json?q=bug+fix`

### Notifications
- **Fetch notifications:** `GET /notifications.json`
  - Scope required: `notifications`
  - Returns only the user's own notifications
  - Query params: `limit`, `offset` for pagination

- **Mark as read:** `PUT /notifications/:id/mark_read` (or `mark_all_as_read`)
  - Scope required: `notifications`
  - Clears the notification

- **Fetch current user info:** `GET /session/current.json`
  - Scope required: `session_info` (or no auth)
  - Returns logged-in user details (username, trust_level, etc.)

### Rate Limits
- **Per user API key:** 20 requests per minute, 2,880 requests per day (site default)
- **Applies per user**, not per key—if a user has multiple keys, they share the same rate limit
- Admin can adjust via `throttle_user_api_key_requests_per_minute` and `throttle_user_api_key_requests_per_day` settings

**Sources:**  
[Discourse REST API Examples](https://meta.discourse.org/t/discourse-rest-api-comprehensive-examples/274354)  
[Create Topic/Post via API](https://meta.discourse.org/t/create-a-topic-post-as-a-user-with-api/181677)  
[Get User Permissions](https://meta.discourse.org/t/get-users-permissions-for-topic-via-the-api/309070)

---

## Admin Requirements & Gotchas

### Admin Settings to Check/Enable

- **`enable_api`** — Must be ON (default is ON)
- **`allow_user_api_keys`** — Must be ON (default is ON)
  - If OFF, users cannot generate their own User API Keys
  - Admin still can create global API keys, but users cannot opt-in to User API Keys

- **`allow_user_api_key_clients`** — Default is ON; allows clients to request User API Keys
  - Admin can disable if they want to restrict third-party apps

- **Trust level for API key generation:**
  - Default: Trust Level 0 (all users) can generate User API Keys
  - Configurable via site settings if admin wants to restrict to higher trust levels
  - Users must have at least the minimum trust level to generate a key

**Source:** [Create and Configure API Keys](https://meta.discourse.org/t/create-and-configure-an-api-key/230124)

### Key Expiry & Refresh

- **Auto-revocation:** User API Keys expire after **180 days of inactivity** (configurable per site)
- **No refresh token:** Keys do not auto-refresh; users must generate a new key after expiry
- **Manual revocation:** Users can revoke their own keys in preferences; admin can revoke any key
- **Implication for MCP:** Store key generation date; prompt user to re-authorize if approaching 180 days of inactivity

**Source:** [User API Keys Specification](https://meta.discourse.org/t/user-api-keys-specification/48536), [Discourse MCP Documentation](https://github.com/discourse/discourse-mcp)

### Edit Restrictions & Gotchas

1. **Post edit time limit:** By default, users can only edit posts within a configurable window (e.g., first 24 hours). After that, even a `write`-scoped key cannot edit—Discourse enforces the time limit at the permission layer.

2. **Topic title edit:** Requires higher permissions than reply edits. User must have "can_edit_topic" permission in the category.

3. **Category permissions:** Create/reply operations check category visibility and "can_reply" permission. If a category is locked to "see & reply only," the user cannot create new topics but can reply.

4. **Trust level requirements:** Some categories, posting frequency, and file upload permissions are trust-level-gated. A key cannot override these—it respects the user's actual trust level.

**Source:** [Unable to Edit Topic via API](https://meta.discourse.org/t/unable-to-edit-topic-via-api-despite-topic-write-access/219805), [Create Topic in Restricted Category](https://meta.discourse.org/t/cannot-create-topic-via-api-when-category-is-see-reply-only/374217)

---

## Implementation Reference: Discourse MCP

A reference MCP server already exists that handles User API Key generation and per-user authenticated requests:

**Repository:** [discourse/discourse-mcp](https://github.com/discourse/discourse-mcp)

**Key Implementation Details:**
- Uses command: `npx @discourse/mcp@latest generate-user-api-key --site https://discourse.example.com`
- Optionally specify scopes: `--scopes "read,write,notifications"`
- Generates RSA key pair locally
- Handles the `/user-api-key/new` handshake automatically
- Decrypts and stores the key securely
- Can be reused for automated requests

**Configuration for Server Setup:**
```bash
# Generate and store a user API key
npx @discourse/mcp@latest generate-user-api-key --site https://discourse.example.com --scopes "read,write,notifications"
```

Then use the key in subsequent API calls:
```bash
curl -H "User-Api-Key: <key>" https://discourse.example.com/session/current.json
```

**Source:** [Discourse MCP Repository](https://github.com/discourse/discourse-mcp)

---

## Security Model: Public-Key Cryptography

The User API Key flow uses **asymmetric encryption (RSA)** to ensure credentials are never transmitted in cleartext:

1. **Client generates keypair** locally (private key never leaves client)
2. **Client sends public key** to Discourse (non-secret)
3. **Discourse encrypts the User API Key** using the public key
4. **Encrypted payload redirected** to client (safe to transmit over HTTP)
5. **Only client can decrypt** with private key (server cannot read the key once encrypted)

This design is **trust-on-first-use (TOFU)**: the client's public key is implicitly trusted (typically transmitted over HTTPS). If an attacker intercepts and substitutes the public key, they could decrypt the response. **Best practice:** generate the keypair and obtain the key over HTTPS and TLS-verified connections.

**Source:** [User API Keys Controller](https://github.com/discourse/discourse/blob/main/app/controllers/user_api_keys_controller.rb)

---

## Recommended Architecture for VCG Forum MCP

### Per-User Authentication Flow

1. **First-time setup (user-driven):**
   - MCP guides user to generate a User API Key via the Discourse MCP generator or web interface
   - User chooses scopes (recommend: `read,write,notifications,session_info`)
   - User's private key stored locally (not in MCP server)

2. **Recurring requests (MCP-initiated):**
   - User provides MCP with their User API Key (or MCP stores it securely on their behalf)
   - MCP includes key in `User-Api-Key` header for all requests
   - Each request operates as that user (inherits their permissions)

3. **No admin burden:**
   - No global API key needed
   - No secret sprawl
   - No impersonation risk
   - Forum admin only needs to ensure `enable_api` and `allow_user_api_keys` are ON (defaults)

### Scopes for VCG Use Cases

Based on the MCP requirements (read topics, search, edit own posts, reply, create topics, check notifications):

```
scopes: "read,write,notifications,session_info"
```

- `read` — search, read posts, check topic details
- `write` — create topics, reply, edit own posts
- `notifications` — fetch & clear notifications
- `session_info` — verify current user context

---

## Summary Table: User API Keys vs. Global Keys

| Aspect | User API Key | Global Admin Key |
|--------|--------------|-----------------|
| **Who creates** | Any user (with min. trust level) | Admin only |
| **Acts as** | The user who created it | Any user (if scoped to "All Users") |
| **Secret management** | User responsible | Admin responsible |
| **Per-user rate limits** | Yes (20 req/min, 2880/day per user) | Shared across all uses |
| **Audit trail** | Clear (key ≡ user) | Opaque (key ≡ app, not user) |
| **Security for multi-user** | ✅ Excellent | ❌ Poor (shared secret) |
| **Expiry** | 180 days inactivity (auto-revoke) | Manual revocation only |
| **Suitable for MCP** | ✅ YES | ❌ NO |

---

## Sources

1. [User API Keys Specification — Discourse Meta](https://meta.discourse.org/t/user-api-keys-specification/48536) — Official specification of the User API Key authorization protocol, scopes, parameters, and encryption handshake.

2. [Create and Configure an API Key](https://meta.discourse.org/t/create-and-configure-an-api-key/230124) — Admin guide to creating API keys, comparison of global vs. scoped keys, trust level defaults.

3. [Discourse MCP GitHub Repository](https://github.com/discourse/discourse-mcp) — Reference implementation of User API Key generation and authenticated requests; includes CLI tool for key generation.

4. [User API Keys Controller (GitHub source)](https://github.com/discourse/discourse/blob/main/app/controllers/user_api_keys_controller.rb) — Source code for the authorization flow, public-key handshake, encryption, and payload handling.

5. [Discourse REST API Comprehensive Examples](https://meta.discourse.org/t/discourse-rest-api-comprehensive-examples/274354) — Examples of creating topics/posts, editing, searching, and fetching notifications.

6. [API Key as a Query String Parameter Security Risk](https://meta.discourse.org/t/api-key-as-a-query-string-parameter-is-a-security-risk-right/67661) — Explanation of why global API keys are a security risk in multi-user contexts.

7. [Unable to Edit Topic via API Despite Topic Write Access](https://meta.discourse.org/t/unable-to-edit-topic-via-api-despite-topic-write-access/219805) — Discusses edit time limits and permission enforcement even with scoped keys.

8. [Create Topic via API When Category is "See & Reply Only"](https://meta.discourse.org/t/cannot-create-topic-via-api-when-category-is-see-reply-only/374217) — Category-level permission interaction with API scopes.

9. [Get User's Permissions for Topic via API](https://meta.discourse.org/t/get-users-permissions-for-topic-via-the-api/309070) — How to verify user permissions before attempting operations.

10. [Per User API Keys Not Working](https://meta.discourse.org/t/per-user-api-keys-not-working/201415) — Troubleshooting guide for User API Key issues.

11. [Generating User API Keys with REST API](https://meta.discourse.org/t/generating-user-api-keys-with-rest-api/61916) — API-driven key generation (alternative to web UI).

12. [Discourse API Docs](https://docs.discourse.org/) — Official API documentation for endpoints, parameters, and responses.

---

## Recommendation for @architect

**Use User API Keys exclusively for per-user MCP authentication.**

The User API Key system was purpose-built for this use case: third-party applications acting on behalf of individual users without admin involvement or shared secrets. The cryptographic handshake ensures credentials are never exposed, and the 180-day auto-revocation plus per-user rate limiting provide security guardrails.

**No global API keys needed.** Each forum user generates their own key via the Discourse web UI (or the MCP generator tool), stores it securely on their own device/client, and uses it to authenticate their own MCP requests.

**Implementation path:**
1. Document the User API Key generation flow in MCP setup instructions
2. Store/transmit User API Keys over secure channels (HTTPS, user's device)
3. Scope keys to `read,write,notifications,session_info` (recommend to users)
4. Handle 180-day expiry by prompting users to re-authorize if key stops working
5. Verify admin has `enable_api` and `allow_user_api_keys` ON (should be defaults)

This approach shifts the security burden appropriately: users own their credentials, Discourse manages the cryptography, and the MCP server operates transparently with no secrets.
