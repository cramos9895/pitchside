# 🧩 Navbar

**Type:** #component **Location:** `src/components/Navbar.tsx`

## 🎛️ Local State & UI Logic

- **Immersive View Logic**:
    - The Navbar uses `usePathname()` to monitor the current route. It implements an automatic exclusion rule for "Live Displays" (any URL containing `/live` or `/display`). If a match is found, the Navbar returns `null`, allowing scoreboard and bracket displays to occupy the full screen without administrative UI clutter.
- **Global Navigation Entry Point**:
    - The Navbar serves as the primary trigger for the `Sidebar` overlay. Instead of a standard horizontally-linked menu, it delegates all navigation responsibility to the Sidebar, ensuring a consistent user experience between mobile and desktop environments.
- **Branded Aesthetic**:
    - Features a high-contrast `PITCH-SIDE` logo with a `pitch-accent` highlighter.
    - The layout is pinned to the top of the viewport using `sticky top-0` and `z-50`, ensuring branding and menu access remain persistent during deep scrolls.
- **Adaptive Action Suite**:
    - Conditionally renders the `AuthButton` (Sign-in/Sign-out logic) for larger screen sizes (`hidden md:block`), while reserving the `Menu` icon as the primary interaction point for all viewports.

## 🔗 Used In (Parent Pages)

- `src/app/layout.tsx` (Global application layout)

## ⚡ Actions & API Triggers

- **`setIsSidebarOpen(true)`**: Opens the global navigation drawer.

---

**Navbar is the "Platform Anchor," providing branding, session management, and primary navigation access while intelligently yielding real estate for immersive facility displays.**