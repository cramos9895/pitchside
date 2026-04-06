# 📄 Facility Directory (Admin)

**Path:** `src/app/admin/(dashboard)/facilities/page.tsx` (Global Partner Hub)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Security Guard (Access Denied):** A full-screen fallback component that triggers if the authenticated user lacks `super_admin` or `master_admin` privileges. Features high-visibility `ShieldAlert` iconography.
    - **Global Hub Header:** Standardized administrative header with a `Building2` icon, clearly identifying the page objective: "Global hub of all registered B2B partner venues."
    - **Facility Directory Table:** A bespoke list component designed for administrative scanning:
        - **Facility Identity:** Displays the full name paired with a truncated version of the database UUID for technical reference.
        - **Geographic Data:** Displays the primary street address with a `MapPin` icon.
        - **Inventory Chip:** A specialized badge (`bg-pitch-accent/10`) that displays the total number of resources (fields/courts) associated with that venue.
- **Imported Custom Components:**
    
    - N/A (Uses standard semantic HTML and Tailwind for the directory grid).
- **Icons (lucide-react):**
    
    - `ShieldAlert`, `Building2`, `MapPin`, `ChevronRight`

## 🎛️ State & Variables

- **Role-Based Authorization:**
    - **`isSuperAdmin`**: A computed boolean derived from the `profiles` table. Access is gated specifically to `system_role === 'super_admin'` or `role === 'master_admin'`. Failure to meet this requirement results in a non-bypassable denial UI.
- **Service-Role Data Fetching:**
    - **`adminClient`**: Unlike standard pages, this module utilizes `createAdminClient()` (Service Role) to intentionally bypass RLS. This allows top-level administrators to view facilities across all tenants and regions simultaneously.
- **Relational Aggregates:**
    - **`resources(count)`**: The Supabase query utilizes the `.select('..., resources(count)')` syntax to fetch the inventory count in a single round-trip, preventing N+1 query issues.

## 🔗 Links & Routing (Outbound)

- `/login` (Automatic auth-guard redirect)
- `/admin/facilities/[id]` (Detailed view for partner management and resource auditing)

## ⚡ Server Actions / APIs Triggered

- [[createClient]] (Standard client for identity verification)
- [[createAdminClient]] (Administrative client for global system access)

---

**The Facility Directory serves as the root index for PitchSide's B2B ecosystem, providing system administrators with a birds-eye view of all partner inventory.**