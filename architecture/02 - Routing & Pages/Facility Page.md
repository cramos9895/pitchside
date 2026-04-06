# 📄 Facility Dashboard Page

**Path:** `src/app/facility/page.tsx` (Facility Admin Overview)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Admin Greeting Header:** A personalized स्वागत (welcome) section that dynamically resolves the logged-in administrator's facility name from the database.
    - **Facility KPI Grid:** A responsive 3-column metric display styled with `pitch-card` containers, featuring:
        - **Active Leagues Card:** Uses the `Users` icon with an emerald tint (`pitch-accent`) to track live league counts.
        - **Resource Summary Card:** Uses the `MapPin` icon with a blue tint to track the total number of fields and courts under management.
        - **Upcoming Games Card:** Uses the `Calendar` icon with a purple tint to track scheduling volume for the next 7-day window.
- **Imported Custom Components:**
    
    - _(Note: This is a Server Component intended for high-priority data resolution; sub-tab logic is typically handled in sibling pages or layouts)._
- **Icons (lucide-react):**
    
    - `Calendar`, `MapPin`, `Users`
- **Buttons / Clickable Elements:**
    
    - _(The primary navigation for this dashboard is managed via the persistent sidebar provided by the facility layout)._

## 🎛️ State & Variables

- **Server-Side Context:**
    
    - `facilityName`: A local variable that defaults to "Your Facility" and is dynamically overwritten once the `facility_id` is successfully resolved.
- **Access Control & Routing Logic:**
    
    - **Authentication Shield:** Strictly enforces user presence via [[supabase.auth.getUser]]; routes anonymous traffic to `/login`.
    - **Role Hierarchy:** Queries the `profiles` table specifically for the `facility_id` foreign key to ensure that data isolation is maintained specifically for that admin's venue.
- **Database Queries (Server-Side):**
    
    - **Administrative Context:** [[supabase.from('profiles').select('system_role, facility_id')]] targeting the authenticated user.
    - **Branding Fetch:** Relational query to the `facilities` table to pull the specific `name` associated with the admin's account.

## 🔗 Links & Routing (Outbound)

- `redirect('/login')` (Primary auth gate)

## ⚡ Server Actions / APIs Triggered

- [[createClient]] (Instantiates the server-side Supabase connection)
- [[animate-in fade-in duration-500]]: Framer-motion style Tailwind utilities applied to the main wrapper for smooth dashboard transitions.