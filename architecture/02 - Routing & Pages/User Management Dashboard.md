# 📄 User Management Dashboard

**Path:** `src/app/admin/(dashboard)/users/page.tsx` (Global User & Security Center)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Management Header:** A standardized administrative header featuring a purple `Users` icon and a real-time counter showing the **Total Platform Users**.
    - **[[UserTable]] (Core Module):** A high-performance client component that serves as the primary system-wide user directory.
        - **Real-Time Scouting:** Uses a debounced search input to filter the user list by name or email without page reloads.
        - **Permission Controls:** Inline role selection dropdowns for upgrading users to `host` or `master_admin` status. This feature is disabled for the current user's own account to prevent accidental lockout.
        - **Security Audit Column:** A dedicated column displaying the status of the **Global Platform Waiver**, including timestamped signature verification for insurance compliance.
    - **Player Suspension Modal (Ban Hub):** A specialized administrative popup for enforcing platform safety:
        - **Permanent Ban:** A "Hard Ban" toggle that blocks all platform access indefinitely.
        - **Temporary Suspension:** A date-time picker for "Soft Bans" that automatically expires and restores access.
        - **Internal Audit Log:** A private `ban_reason` field for tracking administrative rationale.
- **Imported Custom Components:**
    
    - [[UserTable]] (The central interactive grid module).
- **Icons (lucide-react):**
    
    - `Users`, `Shield`, `Search`, `Loader2`, `Ban`, `ArrowUp`, `ArrowDown`

## 🎛️ State & Variables

- **Hierarchical Permission Logic:**
    - The dashboard distinguishes between standard database `role` (Player, Host, Master Admin) and the overarching `system_role` (Super Admin). **Super Admins** are visually highlighted with distinct red branding and cannot be modified by standard Master Admins.
- **Client-Side Optimization:**
    - **Dynamic Sorting:** Users can be sorted by their role weight (Player < Host < Master Admin) to quickly identify high-privilege accounts.
    - **Optimistic State Management:** Use of `setProfiles` provides instantaneous UI feedback for role transitions and suspensions before the backend persistence is confirmed.
- **Relational Data Filtering:**
    - The server-side query specifically joins `waiver_signatures` where `facility_id` is null, ensuring the UI only reflects the **Platform-Wide Master Agreement**.

## 🔗 Links & Routing (Outbound)

- `/admin` (Redirect for unauthorized access)
- `/login` (Auth-guard fallback)
- All modifications trigger `router.refresh()` to synchronize the server-side cache.

## ⚡ Server Actions / APIs Triggered

- **Direct Profile Updates:** Role elevations and ban enforcements are executed via direct `supabase.from('profiles').update()` calls.
- **Initial Hydration:** The page fetches the complete user set on the server to prevent "Loading..." states during the initial dashboard mount.

---

**User Management is the platform's security cockpit, enabling Master Admins to oversee platform-wide compliance, regulate host permissions, and enforce community standards via the Suspension Hub.**