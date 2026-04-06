# ⚙️ profiles

**Type:** #api #database #identity **Location:** `src/app/actions/profiles.ts`

## 📄 Expected Payload / Schema

- **searchProfiles**: `query` (string) with a minimum length of 2 characters.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()` (via the standard `createClient`).
- **Data Privacy**: Implements strict **Data Minimization**. The query only retrieves public-facing fields (`id`, `full_name`, `email`), intentionally excluding sensitive PII such as phone numbers, wallet balances, or account roles.
- **DDoS Mitigation**: Enforces a 10-record result limit and a 2-character minimum threshold to prevent expensive and potentially broad table scans.

## 🧪 Business Logic & Math

- **Case-Insensitive Search**:
    - Converts input queries to lowercase.
    - Employs the **`ilike`** (Case-Insensitive Like) operator combined with wildcard wrapping (`%query%`).
    - **Dual-Field Search**: Atomically checks both the `full_name` and `email` columns using a SQL `.or()` filter, allowing for flexible lookup (e.g., searching by "John" or "john@gmail.com" yields the same profile).
- **Zero-State Handling**:
    - If the query is empty or too short, the action returns an empty successful array instead of an error, ensuring a smooth integration with frontend auto-complete components.

## 🔄 Returns / Side Effects

- **Returns**: `{ success: boolean, profiles: Array<{id, full_name, email}> }`.
- **Side Effects**: None. This is a read-only utility.

---

**`profiles` provides the high-velocity identity bridge for the platform, enabling administrative "Invite to Team" and "Player Lookup" features with privacy-aware filtering.**