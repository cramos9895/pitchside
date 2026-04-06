# 🧩 UserTable

**Type:** #component **Location:** `src/components/admin/UserTable.tsx`

## 📥 Props Received

- **initialProfiles** (array of [[Profile]]): The base list of user data fetched from the server.

## 🎛️ Local State & UI Logic

- **`profiles`**: Synchronized list of users that reflects optimistic updates after role or ban changes.
- **`loadingMap`**: A granular loading state (Record<string, boolean>) that prevents parallel click events on specific user rows during async operations.
- **`filteredProfiles`**: A memoized derivation that handles real-time text searching (Name/Email) and hierarchical role sorting (Master > Host > Player).
- **Role Hierarchy UI**: Dynamically applies custom CSS classes and color tokens (Purple for Master, Orange for Host, Green for Player) to the role badges and selection dropdowns.
- **Ban Management Modal**: A state-driven overlay that manages "Hard Bans" (permanent) and "Soft Bans" (expiration-dated), including a private `ban_reason` field for administrative audit trails.
- **Self-Protection Logic**: Detects the `currentUserId` and disables the role-switcher and ban buttons for the logged-in user to prevent accidental self-lockout.

## 🔗 Used In (Parent Pages)

- `src/app/admin/(dashboard)/users/page.tsx`

## ⚡ Actions & API Triggers

- **[[supabase.auth.getUser]]**: Invoked on mount to identify the session user for security constraints.
- **[[/api/profiles/update]] (via Supabase Client)**:
    - Triggered by the role `<select>` to escalate or demote account permissions.
    - Triggered by the **Save Settings** button in the Manage Modal to persist ban metadata.
- **`router.refresh()`**: Called after every successful profile update to ensure server-side data consistency and trigger Next.js revalidation.

---

**UserTable.tsx serves as the platform's primary governance tool, allowing high-level administrators to manage the user lifecycle from onboarding to disciplinary enforcement.**