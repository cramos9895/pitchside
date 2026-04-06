# ⚙️ supabase-client

**Type:** #infrastructure #database #auth  
**Location:** `src/lib/supabase/`

## 📄 Expected Payload / Schema

- **[[createClient]] (Browser)**: No parameters. (Returns `SupabaseClient`)
- **[[createClient]] (Server)**: No parameters. (Returns `Promise<SupabaseClient>`)
- **[[createAdminClient]]**: No parameters. (Returns `Promise<SupabaseClient>`)

## 🛡️ Security & Permissions

- **RLS Sovereignty**: The standard `createClient` (both Browser and Server flavors) is the platform's **Security Gatekeeper**. It automatically attaches the user's JWT (JSON Web Token) from the browser session/cookies to every request, ensuring that Supabase enforces Row Level Security (RLS) policies based on the user's ID and role.
- **The "God-Mode" Bypass**: `createAdminClient` is the platform's **Administrative Skeleton Key**. It utilizes the `SUPABASE_SERVICE_ROLE_KEY`, allowing server-side actions (`[[update-game]]`, `[[league-matches]]`, `[[stripe]]`) to bypass all RLS constraints. This is strictly prohibited in client-side code and is guarded by environment variable isolation.
- **Cookie Synchronization**: The server client implements a robust `setAll` handler for Next.js cookies. It includes a `try/catch` safety valve that prevents application crashes when the client attempts to refresh a session from within a read-only Server Component.

## 🧪 Business Logic & Math

- **Environment Polymorphism**:
    - **Browser Flavor**: Optimized for low-latency, singleton-style usage in client-side components (`src/lib/supabase/client.ts`).
    - **Server Flavor**: Optimized for dynamic, per-request cookie handling in Next.js Server Actions and API Routes (`src/lib/supabase/server.ts`).
- **Atomic Session Management**:
    - The utility automates the complex "handshake" between Next.js and Supabase, ensuring that the `auth.uid()` function in the database always reflects the correct logged-in user without manual token passing.

## 🔄 Returns / Side Effects

- **Returns**: A fully configured Supabase client instance (`SupabaseClient`) tailored for the current execution context.
- **Side Effects**: In the server-side flavor, the client may update or refresh the user's session cookies during a request lifecycle, effectively renewing their login token without user intervention.

---

**`supabase-client` is the platform's "Data Bridge," providing the essential, security-aware connectivity that links the Next.js application layer to the Supabase postgreSQL core.**