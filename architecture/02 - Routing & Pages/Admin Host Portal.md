# 📄 Admin Host Portal

**Path:** `src/app/admin/(dashboard)/page.tsx` (Administrator Control Center)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Host Portal Header:** A high-contrast administrative banner featuring a `Shield` icon and a "Red Alert" branding (`text-red-500`) to differentiate it from the player-facing sections of the app.
    - **Quick Actions:** A prominent "Create New Game" button (`bg-pitch-accent`) that provides immediate access to the `/admin/create-game` creation wizard.
    - **[[AdminGameList]]**: The primary interactive element of the dashboard. It receives pre-enriched game data and manages the categorized display (Upcoming vs. Past) and search functionality.
- **Imported Custom Components:**
    
    - [[AdminGameList]](Handles tabbed navigation and match filtering)
    - [[AdminPickupCard]] (Rendered within the list for standard matches)
    - [[AdminTournamentCard]] (Rendered within the list for competitive events)
- **Icons (lucide-react):**
    
    - `Shield`, `Plus`

## 🎛️ State & Variables

- **Intelligent Roster Calculation:**
    
    - **current_players:** This is a dynamic metric calculated on the server. It resolves the "Tournament vs. Pickup" discrepancy by taking the `Math.max` between `tournament_registrations` (for structured play) and `activeBookings` (for pickup matches).
    - **activeBookings:** Filtered specifically for `status === 'paid'` or `status === 'active'`, ensuring waitlisted or cancelled players don't inflate the host's roster view.
    - **current_teams:** Calculated by generating a `Set` of unique `team_id` from current registrations to show how many squads are currently formed.
- **Caching & Consistency:**
    
    - **`revalidate = 0`**: Explicitly disables the Next.js cache for this route, ensuring that as players register in real-time, the Host Portal reflects those spots immediately.
- **Database Fetches (Server-Side):**
    
    - Queries the `games` table with a deep selection of `tournament_registrations` and `bookings`.

## 🔗 Links & Routing (Outbound)

- `/admin/create-game' (Redirect to the creation flow)
- `/admin/matches/[id]/manage` (Deep link from the game cards to the Roster Command Center)

## ⚡ Server Actions / APIs Triggered

- [[createClient]] (Supabase server-side client)
- Server-side data processing for `enrichedGames`.

---

**The Host Portal is the operational brain of PITCHSIDE, optimized for real-time monitoring of match capacity and registration health.**