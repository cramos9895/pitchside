# 📄 Captain Command Center

**Path:** `src/app/tournaments/[id]/team/[team_id]/page.tsx` (Team Management Portal)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Captain Command Center:** A specialized management hub (rendered via [[CaptainDashboard]]) that empowers team captains to lead their squad through a specific tournament or league season.
    - **Squad Overview:** Displays the current list of confirmed players, their preferred positions, and their profile avatars.
    - **Recruitment Center:** Integrates a **Free Agent Pool** directly into the dash, allowing captains to browse unassigned talent registered for the same event and draft them to their roster.
    - **Automated Invite System:** Generates unique, protocol-aware recruitment links (HTTP/HTTPS) that allow captains to share their squad's joining page on external platforms.
- **Imported Custom Components:**
    
    - [[CaptainDashboard]]: The primary client-side container that handles recruitment logic, roster state, and UI feedback.
- **Icons (lucide-react):**
    
    - _(Note: Iconography and secondary UI elements are handled within the specialized [[CaptainDashboard]] child component)._
- **Buttons / Clickable Elements:**
    
    - _(Managed within the [[CaptainDashboard]] component for drafting, inviting, and team customization)._

## 🎛️ State & Variables

- **Server-Side Data Aggregation:**
    
    - **Tournament Polymorphism:** The page logic is designed to handle both "Tournaments" (stored in `games`) and "Leagues" (stored in `leagues`). It performs a serial lookup to identify the correct event entity and normalize its pricing and metadata for the UI.
    - **Normalization Object:** Consolidates keys like `price_per_team`, `deposit_amount`, and `has_registration_fee_credit` into a single `tournament` object passed to the client.
    - **Dynamic Host Detection:** Uses `next/headers` to detect the current `host` and `protocol`, ensuring generated invite links work correctly across local, staging, and production environments.
- **Database Queries (Server-Side):**
    
    - **Auth Check:** [[supabase.auth.getUser]] to ensure the manager is authenticated.
    - **Dual Table Lookup:** Performs a [[maybeSingle]] check on `games`, followed by `leagues` if no tournament is found.
    - **Team Context:** Fetches identity and color settings from the `teams` table.
    - **Roster & FA Query:** Performs two separate fetches on `tournament_registrations`:
        1. **Team Roster:** Filtered by `team_id`.
        2. **Free Agent Pool:** Filtered where `team_id` is null and the registration is associated with the current event ID.

## 🔗 Links & Routing (Outbound)

- `redirect('/login')` (Auth requirement)
- `notFound()` (Error handling for invalid IDs)
- `tournaments/${id}` (Base path for generated recruitment links)

## ⚡ Server Actions / APIs Triggered

- [[createClient]] (Instantiates the server-side Supabase connection)
- [[revalidate = 0]]: Disables static caching for this route to ensure captains always see real-time roster updates.