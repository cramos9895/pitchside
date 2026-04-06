# 📄 Live Marketplace (God View)

**Path:** `src/app/admin/(dashboard)/marketplace/page.tsx` (Global Inventory Monitor)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Marketplace Command Header:** A high-impact header featuring the "Live Marketplace" title and a `Tag` icon. It reinforces the system's core philosophy: **Empty unbooked slots are automatically treated as marketable inventory.**
    - **[[LiveCalendarLoader]] (Control Layer):** A specialized wrapper that facilitates cross-facility schedule auditing.
        - **Facility Switcher:** A prominent dropdown that allows Master Admins to toggle between different partner venues. It displays the Facility Name, City, and State for rapid identification.
        - **Targeting Metadata:** A "Target Facility" status bar with a `MapPin` icon to keep the admin grounded in the current context.
    - **God-View Schedule Feed:** Renders the central `FacilityCalendar` in a privileged `isMasterView={true}` mode. This view exposes internal booking data and "Open Inventory" that is typically only visible to the facility owner.
    - **Live Feed Indicator:** A pulsating visual anchor (`bg-pitch-accent animate-pulse`) at the bottom of the page confirming the real-time nature of the "God View" data stream.
- **Imported Custom Components:**
    
    - `[[LiveCalendarLoader]]` (The facility switcher and data orchestrator).
    - `[[FacilityCalendar]]` (The shared enterprise calendar engine, running in Master mode).
- **Icons (lucide-react):**
    
    - `Tag`, `MapPin`, `Building2`

## 🎛️ State & Variables

- **Real-Time Inventory Logic:**
    - The marketplace is fundamentally **time-based**. Unlike a standard e-commerce store, "stock" is defined by unused blocks on a facility's field/court resource.
- **Master Authorization:**
    - Explicitly gated to `system_role === 'super_admin'` or `role === 'master_admin'`. Standard facility hosts or players are redirected to the root `/` path.
- **Dynamic Context Switching:**
    - **`selectedFacilityId`**: Managed in the `LiveCalendarLoader` state. Updating this ID triggers a complete re-mount of the `FacilityCalendar` (via the `key` prop), ensuring zero data leakage between different partner venues.

## 🔗 Links & Routing (Outbound)

- `/login` (Unauthenticated fallback)
- `/` (Access-denied fallback for non-super admins)

## ⚡ Server Actions / APIs Triggered

- **Cross-Tenant Data Fetching:** The `FacilityCalendar` component, when running in this route, utilizes administrative privileges to fetch schedule data across different facility IDs.
- [[createClient]]: Handles the initial identity check.

---

**The Live Marketplace is the "God View" observatory of the PitchSide network, allowing system administrators to monitor availability, verify schedule accuracy, and oversee the global inventory of unbooked time-slots across all partner facilities.**