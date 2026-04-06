# 🧩 AuthButton

**Type:** #component **Location:** `src/components/AuthButton.tsx`

## 🎛️ Local State & UI Logic

- **Session Lifecycle Management**:
    - On component mount, the button initializes an asynchronous session check via `supabase.auth.getSession()`.
    - It establishes a long-running event listener using `onAuthStateChange`. This ensures that the UI remains in sync with the platform's authentication state (e.g., automatically updating when a user signs out from a different tab or after a session timeout).
- **Conditional Rendering Architecture**:
    - **Guest View**: Displays a "Login" text link and a "Sign Up" primary action button with a white-to-accent hover transition.
    - **User View**: Replaces the links with a compact profile cluster. This includes a `pitch-accent` circular avatar containing a `UserIcon` and a display name derived from the user's email prefix (e.g., `christian.ramos` from `christian.ramos@gmail.com`).
- **Responsive Display**:
    - The user's name is hidden on mobile devices (`hidden md:inline`) to preserve navbar real estate, leaving only the avatar and the logout icon.
- **Post-SignOut Revalidation**:
    - Upon clicking the logout icon, the component triggers the `signOut()` action and immediately calls `router.refresh()`. This forces Next.js to re-evaluate the Server Component tree, ensuring that protected layouts and private data are instantly purged from the view.

## 🔗 Used In (Parent Pages)

- `src/components/Navbar.tsx` (Global public header)
- `src/components/Sidebar.tsx` (Global administrative/dashboard controller)

## ⚡ Actions & API Triggers

- **`supabase.auth.signOut()`**: The core Supabase Auth primitive for session termination.
- **`router.refresh()`**: Next.js navigation hook to re-validate the current page route.

---

**AuthButton is the platform's primary authentication entry point, providing a consistent, reactive interface for session management across both public and administrative surfaces.**