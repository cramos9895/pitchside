# 🔐 Identity & Session Flow

**Status:** #draft #security 
**Last Audit:** 2026-04-10
**Audit Findings:** High-fidelity Role-Based Access Control (RBAC) in middleware. No current rate-limiting or geo-locking identified.

## 🔄 The Lifecycle of a Session

### 1. Authentication (`supabase.auth`)
- **Login**: Users authenticate through [[LoginForm]] using email/password.
- **Provider**: Supabase Auth (JWT-based).
- **Persistence**: Tokens are stored in HTTP-only cookies managed by `@supabase/ssr`.

### 2. Authorization & Profile Linking
- The platform uses a double-check system:
    1. **Auth Session**: Confirms the user is "Who they say they are."
    2. **Profile Sync**: Middleware fetches the corresponding record from [[profiles (supabase)]] to determine "What they can do."

### 3. Middleware Gatekeeper
**Location:** [[middleware.ts]] -> [[src/lib/supabase/middleware.ts]]

The middleware executes on **every request** (except static assets) to enforce:
- **Verification Status**: Redirects `pending` users to `/pending`.
- **Role Routing**: Ensures `facility_admin` users land on the management dashboard.
- **Admin Hardening**: Blocks unauthorized access to `/admin/*`.
    - `admin` / `master_admin` roles have global access.
    - `host_ids` check allows specific users to manage their assigned games without full admin rights.

---

## 🛡️ Active Guardrails (Audit Result)

| Guardrail | Status | Implementation |
|---|---|---|
| **Auth Check** | ✅ Active | Enforced in `updateSession` middleware. |
| **RBAC** | ✅ Active | Page-level redirects based on `profiles.role`. |
| **Pending Gate** | ✅ Active | Verification status check in middleware. |
| **Rate Limiting** | ✅ Active | Hybrid strategy (IP for Public, UserID for Auth) in API/Actions. |
| **Audit Logs** | ⚠️ Partial | Supabase Auth logs exist; `security_logs` tracks throttled requests. |

## 🛡️ Implementation Details: Hybrid Rate Limiting
**Location:** [[rate-limit.ts]]

To balance security and system load, we use a targeted strategy:
- **Unauthenticated (Login/Signup):** Tracked via **IP Address**. This prevents botnet brute-force attacks.
- **Authenticated (Checkout/Messaging):** Tracked via **User ID**. This provides maximum precision and prevents a shared IP (e.g., a corporate office) from locking out multiple valid users.

**Limits enforced:**
- Auth: 5 attempts / 5 minutes.
- Checkout: 5 reqs / 1 minute.
- Messaging: 10 reqs / 1 minute.

---

## 🏗️ Future Hardening Recommendations
- **Rate Limiting**: Implement Upstash or a custom Redis-based limiter in middleware for `/api/*` and `/login`.
- **Audit Table**: Create an `audit_logs` table for sensitive actions (Balance changes, RLS bypasses).
- **Session MFA**: Enable Multi-Factor Authentication for `master_admin` accounts.

---
*Reference: Section 8 of [[instructions.md]] (Wall of RLS).*
