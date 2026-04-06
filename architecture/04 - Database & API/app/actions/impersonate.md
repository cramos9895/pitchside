# ⚙️ impersonate

**Type:** #api #security #utility **Location:** `src/app/actions/impersonate.ts`

## 📄 Expected Payload / Schema

- **enterGodMode**: `facilityId` (UUID) of the target venue.
- **exitGodMode**: No parameters.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Administrative Restriction**: Implements a "Double Lock" check. Only profiles with `system_role: 'super_admin'` or `role: 'master_admin'` are permitted to execute this action.
- **Session Layering**: Uses an **HTTP-Only** cookie (`pitchside_impersonate_facility_id`) for state persistence. This ensures that the impersonation context is securely stored on the server-side and is inaccessible to client-side scripts.

## 🧪 Business Logic & Math

- **The "God Mode" Context Switch**:
    - **Activation**: Validates the requester's elevated permissions against the `profiles` table. If authorized, it writes the target `facilityId` into a cookie with a 24-hour expiration (`maxAge`).
    - **Middleware Integration**: The platform's middleware layer is designed to look for this specific cookie. If found, it overrides the standard session-based facility context with the impersonated ID, effectively "tricking" the UI into rendering the target venue's private data.
- **Secure Handling**:
    - The cookie is marked with `secure: true` in production and `sameSite: 'lax'`, adhering to modern browser security best practices for session management.
- **One-Click Deactivation**:
    - `exitGodMode` provides a clean exit path by explicitly deleting the cookie from the `cookieStore`, immediately terminating the administrative override.

## 🔄 Returns / Side Effects

- **Returns**:
    - On success: Seamlessly triggers a **Server-Side Redirect** to `/facility` (on activation) or `/admin/facilities` (on exit).
    - On failure: Returns a JSON error object (`{ error: string }`).
- **Side Effects**: Modifies the browser's persistent cookie state, affecting all subsequent data fetching operations for the current session.

---

**`impersonate` is the platform's "Super-Admin Troubleshooting Hub," allowing high-level operators to adoption a facility's perspective for zero-latency support and configuration auditing.**