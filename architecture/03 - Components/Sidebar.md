# 🧩 Sidebar

**Type:** #component **Location:** `src/components/Sidebar.tsx`

## 📥 Props Received

- **isOpen** (boolean): Controls the visibility and sliding animation of the panel.
- **onClose** (function): Callback to dismiss the menu and clear the backdrop overlay.

## 🎛️ Local State & UI Logic

- **Hierarchical Access Tunnel**:
    - Dynamically evaluates a user's role across three tiers (Master Admin, Host, Facility Admin) to inject protected navigation segments.
    - **Visual Coding**: Uses distinct color-coded left borders (`blue-400` for Facility, `red-500` for Master, `pitch-accent` for Operations) to psychologically separate administrative duties from player activity.
- **Urgency Propagation (Badges)**:
    - **Financial Urgency**: For Master Admins, it maintains a live count of cancelled games requiring manual refund processing. Displays a persistent `animate-pulse` red badge to ensure financial liability is addressed.
    - **Operational Urgency**: For Facility Admins, it displays a `notificationCount` with an `animate-bounce` effect over the Notifications link.
- **Identity Awareness**:
    - Includes a logic-guarded footer that displays the active `user.email` and a destructive "Sign Out" path that resets both client state and server-side cache via `router.refresh()`.
- **Hybrid Smooth Motion**:
    - Employs `translate-x-full` transitions combined with a `backdrop-blur-sm` overlay to provide a high-end "App-like" feel on both mobile and desktop.
- **Session Revalidation**:
    - Listens for `user.id` changes inside a `useEffect` to ensure that if a user switches accounts or logs in via a modal, the Sidebar immediately reflects their new permissions without requiring a navigation event.

## 🔗 Used In (Parent Pages)

- `src/components/Navbar.tsx` (Triggered by the Hamburger icon)
- `src/app/layout.tsx` (Global availability across the entire route tree)

## ⚡ Actions & API Triggers

- **Supabase `.auth.signOut()`**: Handles the secure termination of the user's JWT session.
- **`router.refresh()`**: A critical Next.js primitive used after logout to ensure all Server Component data is re-fetched under 'Anonymous' permissions.

---

**Sidebar is the platform's primary navigation hub, orchestrating a complex mesh of role-based permissions, financial alerts, and real-time notification counts in a unified mobile-optimized panel.**