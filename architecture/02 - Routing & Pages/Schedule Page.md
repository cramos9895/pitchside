# 📄 Schedule Page

**Path:** `src/app/schedule/page.tsx` (The Hub / Event Hub)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Header Section:** High-impact branding for "The Hub" with a sub-navigation link back to the landing page.
    - **Sticky Tab Navigation:** An Apple-style widget that remains pinned during scroll, allowing users to filter between "All Events", "Pickup Games", "Tournaments", and "Leagues".
    - **Leagues Section:** A dedicated grid area for multi-week league events.
    - **Tournaments Section:** A dedicated grid area for competitive single-day or multi-day tournament events.
    - **Pickup Games Section:** A chronologically grouped list of matches, separated by stylized date headers.
- **Imported Custom Components:**
    
    - [[GameCard]] (Used for pickup match display)
    - [[LeagueCard]] (Used for league-specific display)
    - [[TournamentCard]] (Used for tournament display)
- **Icons (lucide-react):**
    
    - `MapPin`, `Clock`, `ArrowRight`, `Calendar`, `Users`, `Trophy`
- **Buttons / Clickable Elements:**
    
    - **"Back to Home" Link:** Returns the user to the root landing page.
    - **Tab Navigation Links:** Triggers a URL state change via `searchParams` to filter the visible list without a full page reload.
    - **Individual Event Cards:** Clickable triggers for booking (pickup) or registration (tournament/league).

## 🎛️ State & Variables

- **TypeScript Interfaces:**
    
    - [[Game]]: Defines the schema for pickup matches, including player counts and match styles.
    - [[League]]: Defines the specialized schema for league-specific metadata like roster locks and prize types.
- **Data Maps & Arrays (Server-Side):**
    
    - `activeView`: A string derived from `searchParams.view` (defaulting to `'all'`) that controls conditional rendering.
    - `bookingStatusMap`: Maps a `game_id` to its booking `status` for the active user.
    - `bookingIdMap`: Maps a `game_id` to its specific booking `id` for cancellation triggers.
    - `groupedGames`: A `Record<string, Game[]>` that groups match data by formatted date headers for chronological rendering.
    - `tabs`: A static array containing the definition, labels, and icons for the navigation UI.
- **Database Queries:**
    
    - **Auth:** Fetches the current authenticated `user`.
    - **Bookings:** Retrieves active/paid bookings for the user to determine registration status on cards.
    - **Games Query:** Fetches upcoming, non-cancelled matches (specifically filtering out league-type games to prevent duplication).
    - **Leagues Query:** Performs a dual fetch from both the `leagues` table and the `games` table (where `event_type === 'league'`) and merges them.
    - **Tournaments Query:** Fetches upcoming tournaments while joining `tournament_registrations` to display role-based context.

## 🔗 Links & Routing (Outbound)

- `href="/"` (Triggered by the "Back to Home" link)
- `href="/schedule?view=[id]"` (Internal view-switching navigation)

## ⚡ Server Actions / APIs Triggered

- [[createClient]] (Instantiates the server-side Supabase connection)
- [[supabase.auth.getUser]] (Verifies the active session for status correlation)
- [[formatDateHeader]] (Local utility that transforms ISO strings into "Monday, Jan 1" style headers)