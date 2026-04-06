# 📄 Facility Detail & Control Node

**Path:** `src/app/admin/(dashboard)/facilities/[id]/page.tsx` (System Admin Node)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Facility Identity Header:** A dedicated hero section featuring the facility's full name, a `Building2` icon, and the geo-located street address. It also exposes the raw **Globally Unique ID** for technical auditing.
    - **"God Mode" Trigger (Action Bar):** A high-risk administrative button (`bg-red-600`) labeled "Manage Facility." This is the system's "Impersonation Entry Point" that allows top-tier admins to assume the identity of a facility and view its internal dashboard.
    - **Health Check Stats Grid:** A set of visual summary cards designed for rapid auditing:
        - **Registered Resources:** Live count of fields/courts associated with the facility.
        - **Phase 4 Capacity (Placeholders):** Transparent cards for "Active Leagues" and "Total Bookings" that serve as UI anchors for future system expansion.
    - **Roadmap Placeholder:** A branded notification block informing administrators that granular financial logs and booking histories are slated for upcoming development phases.
- **Imported Custom Components:**
    
    - N/A (Standardized administrative layout using Tailwind and Lucide).
- **Icons (lucide-react):**
    
    - `Building2`, `MapPin`, `ShieldAlert`, `Database`, `Trophy`, `CalendarCheck`, `ArrowLeft`

## 🎛️ State & Variables

- **Impersonation State:**
    - **`enterGodMode` Execution:** The "Manage Facility" button is wrapped in a server-action form that invokes impersonation logic. Clicking this button changes the admin's session context to the target facility's `facility_id`.
- **Administrative Logic:**
    - **Super Access Validation:** The page explicitly checks both `system_role` and `role`. If the user is a standard facility host (not a system admin), they are ejected back to the root `/admin` dashboard.
    - **Service-Role Data Resolution:** Uses `createAdminClient` to fetch full facility metadata, including resource counts, which are normally restricted behind multi-tenant RLS boundaries.

## 🔗 Links & Routing (Outbound)

- `/admin/facilities` (Returns to the Global Directory)
- `/admin` (Access-denied fallback)

## ⚡ Server Actions / APIs Triggered

- [[enterGodMode]]: The primary server action for session impersonation. It allows system-level admins to "tunnel" into a facility's private view.
- [[createAdminClient]]: Used to aggregate count data across protected resource tables.

---

**The Facility Detail page is the primary point of intervention for system administrators, providing the "God Mode" mechanism required for troubleshooting partner data.**