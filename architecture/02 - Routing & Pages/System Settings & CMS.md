# 📄 System Settings & CMS

**Path:** `src/app/admin/(dashboard)/settings/page.tsx` (Platform Control Center)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Global Registry Hub:** A navigation dashboard specifically designed for system architects to manage the platform's DNA (Activities, Resource Types, and the Revenue Engine).
    - **Dynamic Payment Configurator:** A centralized form for updating the platform's global Venmo/Zelle handles. Features an integrated **Cache Purge** mechanism to ensure new links are instantly visible to all users.
    - **Notification Command Center:** A specialized toggle-array used to enable or disable system-wide email triggers. This acts as a master "kill switch" for the Resend integration during maintenance or testing.
    - **[[SiteEditor]] (Built-in CMS):** A comprehensive Content Management module that allows Master Admins to modify the public landing page without code changes:
        - **Hero Architect:** Direct editing of the main headline, subtext, and background imagery.
        - **Asset Pipeline:** Integrated upload handling for instructional graphics and branding assets.
        - **Social Proof Editor:** Managed section for updating current user testimonials.
- **Image Intelligence:**
    
    - The `SiteEditor` features real-time image previews and handles the intricate "Public URL" generation via Supabase Storage integration.
- **Imported Custom Components:**
    
    - [[SiteEditor]] (The platform's primary marketing-content engine).
    - [[UserTable]] (Reused for administrative oversight within the settings context).
- **Icons (lucide-react):**
    
    - `Settings`, `Mail`, `Bell`, `DollarSign`, `LayoutTemplate`, `Save`, `ImageIcon`

## 🎛️ State & Variables

- **The Settings Schema:**
    - Data is abstracted into a `SystemSetting` interface, allowing for polymorphic handling of both `boolean` toggles and `string` configurations within the same UI loop.
- **Hierarchical Access Control:**
    - The page performs an explicit `role === 'master_admin'` check. Failure to pass this gate results in a specialized **Access Denied** UI, independent of standard middleware for redundant security.
- **Persistence Logic:**
    - **Optimistic Toggles:** Notification switches use local state to provide instantaneous feedback, reverting only if the Supabase heartbeat fails.
    - **Upsert Strategy:** Payment settings use the `onConflict: 'key'` strategy, ensuring that administrative edits don't create duplicate registry entries.

## 🔗 Links & Routing (Outbound)

- `/admin/settings/activities` (Global Activity Schema)
- `/admin/settings/resources` (Field/Court Archetypes)
- `/admin/settings/financials` (Platform Fee Engine)
- `/login` (Standard Auth Fallback)

## ⚡ Server Actions / APIs Triggered

- [[clearGlobalCache]]: A critical performance action invoked after settings modification to invalidate the stale landing page or dashboard caches.
- **Supabase Storage API**: Used in `SiteEditor` to handle binary asset uploads to the `public-assets` bucket.
- **Supabase Upsert**: For transactional settings updates.

---

**System Settings serves as the platform's "Brain," housing both the technical configurations for the database (Registries) and the creative controls for the public-facing brand (SiteEditor).**