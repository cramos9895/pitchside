# 📄 Dashboard Schedule Page

**Path:** `src/app/dashboard/schedule/page.tsx` (My Schedule Sub-tab)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Page Header:** Simple, clean branding for the "My Schedule" subsection, providing context for the user's personal activity feed.
    - **Tab Filter Bar:** A sticky-ready horizontal filter that allows users to toggle the view between:
        - **Today:** Events specifically occurring on the current calendar day.
        - **Upcoming:** All future events (excluding today).
        - **Past:** Historically completed events.
    - **Unified Event Grid:** A responsive 2-column grid (on tablet/desktop) that dynamically renders either full-width match cards or specialized tournament cards.
    - **Empty State Display:** A stylized fallback UI that appears when no matches are found for the selected tab, featuring deep-links to the "Find a Game" and "Rent a Field" flows.
- **Imported Custom Components:**
    
    - [[TournamentCard]] (Used for rendering tournament registrations)
    - [[GameCard]] (Used for rendering both pickup matches and facility rentals)
- **Icons (lucide-react):**
    
    - `Loader2`, `CalendarRange`, `Clock`, `MapPin`, `RefreshCw`, `Trophy`
- **Buttons / Clickable Elements:**
    
    - **Filter Tabs ("Today", "Upcoming", "Past"):** Local state triggers that re-filter the `events` array without additional database round-trips.
    - **"Find a Game" Link:** (Empty state) Redirects users to the landing page schedule.
    - **"Rent a Field" Link:** (Empty state) Redirects users to the facility booking engine.

## 🎛️ State & Variables

- **TypeScript Interfaces:**
    
    - [[UnifiedEvent]]: A critical normalization interface that flattens disparate data models from the `resource_bookings`, `bookings`, and `tournament_registrations` tables into a single, UI-ready object.
- **React State (Client-Side):**
    
    - `loading`: Manages the initial data hydration state.
    - `user`: Stores the authenticated user context required for card-level interactions.
    - `events`: A master array containing all normalized [[UnifiedEvent]] objects, sorted chronologically.
    - `activeTab`: Controls the runtime filtering logic based on `startTime` and `endTime` comparisons.
- **Data Normalization Logic:**
    
    - **Rental Mapping:** Converts `resource_bookings` into unified events, identifying recurring groups.
    - **Pickup Mapping:** Filters out cancelled games and dropped roster spots, then calculates dynamic `endTime` if one isn't provided (defaulting to 90 minutes).
    - **Tournament Mapping:** Correlates `tournament_registrations` with `games` and `teams` metadata.
- **Database Queries (Client-Side):**
    
    - **Auth:** [[supabase.auth.getUser]] verifies the session and triggers a redirect to `/login` if null.
    - **Triple-Fetch [[Promise.all]]:** Executes three parallel queries to fetch user-specific rentals, match bookings, and tournament registrations for a consolidated view.

## 🔗 Links & Routing (Outbound)

- `href="/login"` (Redirect for unauthenticated users)
- `href="/"` (Direct link to landing page/schedule)
- `href="/facilities"` (Direct link to venue rentals)

## ⚡ Server Actions / APIs Triggered

- [[createClient]] (Instantiates the client-side Supabase connectivity)
- [[setActiveTab]] (Updates the local React state to trigger UI re-renders)