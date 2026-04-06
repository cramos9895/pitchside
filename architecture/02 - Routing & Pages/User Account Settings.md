# 📄 User Account Settings

**Path:** `src/app/settings/page.tsx` (Personal Profile & Security Hub)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Role-Aware Header:** Dynamically displays status badges (e.g., "Master Admin" in yellow or "Administrator" in red) based on the user's platform permissions, providing immediate context of their authority level.
    - **Tabbed Command Sidebar:** A vertical navigation system that allows users to toggle between three distinct functional areas:
        - **Profile Hub:** The central node for personal identity. Includes an interactive avatar uploader with a hover-state `Camera` overlay and fields for sports-specific metadata (e.g., "Primary Position").
        - **Security Vault:** Houses sensitive account operation forms. It bifurcates into "Email Update" (requiring verification) and "Password Rotation" sections.
        - **Preference Center:** A toggle-based interface for managing communication rules. Features custom-animated "Switch" components for game reminders and platform announcements.
    - **[[InstallPrompt]] (PWA Growth):** A specialized component injected into the preferences view that detects mobile browser capabilities and prompts the user to install PitchSide as a standalone application.
    - **Admin Debug Toggle:** A high-alert red section (visible only to `host` and `admin` roles) that allows technical users to enable "Debug Mode" for platform-wide troubleshooting.
- **Imported Custom Components:**
    
    - [[InstallPrompt]] (Mobile distribution engine).
- **Icons (lucide-react):**
    
    - `User`, `Mail`, `Lock`, `Camera`, `Shield`, `AlertTriangle`, `CheckCircle`, `Save`, `Loader2`

## 🎛️ State & Variables

- **The Avatar Pipeline:**
    - Uses an asynchronous upload pattern. Images are dispatched to the `avatars` Supabase Storage bucket, and upon success, the resulting `publicUrl` is immediately persisted to the user's database profile.
- **Form Synchronicity:**
    - Each tab manages its own localized state (e.g., `fullName`, `newPassword`) to prevent accidental data contamination between sections.
- **Role-Based Visibility Layer:**
    - **`isAdmin`**: A derived state that enables access to the "Debug Mode" feature, ensuring technical tools are only exposed to verified administrators.

## 🔗 Links & Routing (Outbound)

- `/login` (Redirect for unauthenticated sessions)
- `router.refresh()` (Invoked after profile saves to synchronize the global application state)

## ⚡ Server Actions / APIs Triggered

- **Supabase Storage (`avatars` bucket):** Primary target for profile imagery.
- **Supabase Auth (`updateUser`):** The engine for critical account changes (Email/Password).
- **Supabase DB (`profiles` table):** The persistence layer for non-critical metadata and notification preferences.

---

**User Settings is the platform's primary bridge between raw authentication and personalized player identity, allowing users to move from "Anonymous Auth" to "Identified Athlete" with a consistent visual style.**