# 📄 Global Activity Schema

**Path:** `src/app/admin/(dashboard)/settings/activities/page.tsx` (Sports Type Registry)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Activity Registry Header:** A standardized administrative header featuring the `Activity` icon. It defines this page as the "Source of Truth" for all sports/activities supported by the PitchSide network.
    - **Global Activity Creator:** A high-contrast inline form (`bg-black/20`) for expanding the platform's DNA. It enables the creation of new activity types (e.g., "Futsal", "Pickleball", "Padel") with custom **Brand Color Mapping** via a native color picker.
    - **[[ActivityItem]] (Management Row):** An interactive client-side component that handles individual activity lifecycle events:
        - **Visual Swatch:** Displays the current brand color assigned to the activity.
        - **Label Transformation:** Allows Master Admins to rename activities or update their color codes without leaving the registry view.
        - **Destruction Control:** A trash-icon button providing a quick-path for removing obsolete activity types from the global schema.
- **Imported Custom Components:**
    
    - [[ActivityItem]] (The interactive row module for schema management).
- **Icons (lucide-react):**
    
    - `Activity`, `Plus`, `Edit2`, `Trash2`, `Check`, `X`

## 🎛️ State & Variables

- **The Activity Model:**
    - Each activity consists of a unique `id`, a display `name`, and a `color_code` (Hex). This color code is used across the system (e.g., in calendar views) to visually distinguish different sport types.
- **Master Authorization:**
    - Access is strictly gated to `role === 'master_admin'`. Standard facility hosts or players attempting to access this internal schema are redirected to the root `/admin` dashboard.
- **Form Persistence:**
    - **Direct Server Actions:** Uses the `action` prop on `<form>` elements to trigger `createGlobalActivityType` and `updateGlobalActivityType` server actions directly, bypassing traditional client-side fetch logic for a "snappier" administrative experience.

## 🔗 Links & Routing (Outbound)

- `/admin/settings` (Navigation back to the Settings Hub)
- `/login` (Standard Auth Fallback)
- `/admin` (Redirect for unauthorized access)

## ⚡ Server Actions / APIs Triggered

- [[createGlobalActivityType]]: The primary action for system expansion.
- [[updateGlobalActivityType]]: Used for refining activity names or visual branding.
- [[deleteGlobalActivityType]]: Used for schema cleanup.

---

**The Global Activity Schema is the foundational registry for PitchSide's multi-sport capabilities, ensuring that every facility on the network uses a standardized set of activity identifiers.**