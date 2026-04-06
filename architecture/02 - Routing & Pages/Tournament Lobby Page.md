# 📄 Tournament Lobby Page

**Path:** `src/app/tournaments/[id]/page.tsx` (Event Hub)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Tournament Hero:** A high-impact branding section featuring the event title in italicized, black-weight typography. It prominently displays the "Official Micro-Tournament" badge and event logistics (Date, Location, Registration count).
    - **Interaction Gateway (Dual CTA):** Two primary-action buttons positioned for maximum visibility:
        - **Register a Team:** Directly routes the user to the team-entry flow.
        - **Join Free Agent Pool:** Allows individual players to sign up for recruitment by existing teams.
    - **Registration Cutoff Shield:** (Conditional) A high-visibility red alert that replaces registration buttons once the cutoff time is reached, preventing post-deadline entries.
    - **Tabbed Activity Center:** A structured hub categorized into:
        - **Registered Teams:** A gallery of verified club cards displaying unique team colors and `Shield` iconography.
        - **Bracket & Schedule:** Monitors the match-generation state, showing either a live match count or a placeholder for an impending release.
        - **Rules & Details:** A stylized, two-column ledger for Match Format (5v5, Half-lengths) and Pitch Policy (Turf shoes, Jersey requirements).
- **Imported Custom Components:**
    
    - [[TournamentLobbyClient]]: The core orchestration component managing the lobby's navigation and interactive state.
- **Icons (lucide-react):**
    
    - `Trophy`, `Calendar`, `MapPin`, `Users`, `ArrowRight`, `ShieldAlert`, `CheckCircle2`, `Shield`
- **Buttons / Clickable Elements:**
    
    - **"Register a Team" / "Join Free Agent Pool" Buttons:** Triggers programmatic navigation via `router.push`.
    - **Lobby Tabs:** Local state triggers that re-filter the content panels without a page reload.

## 🎛️ State & Variables

- **React State (Client-Side):**
    
    - `activeTab`: Governs the visibility of the primary content panels (`'teams'`, `'schedule'`, or `'rules'`).
- **Lobby Logic:**
    
    - **Registration Cutoff Calculation:** Dynamically determines if the event is "past cutoff" by comparing the current system time against the tournament's `start_time`.
    - **Team Colorization:** The UI dynamically injects team-specific `primary_color` hex codes into the roster card borders and icons to maintain club branding.
- **Database Queries (Server-Side):**
    
    - **Tournament Identity:** [[supabase.from('games').select(...) ]] fetches the core event configuration.
    - **Competitor Resolution:** Fetches all records from the `teams` table linked to the current tournament ID.
    - **Bracket Sync:** Performs an exact head-count on the `matches` table to verify if the tournament structure has been materialized by the system admin.

## 🔗 Links & Routing (Outbound)

- `/tournaments/[id]/register?type=team` (Wizard path)
- `/tournaments/[id]/register?type=free_agent` (Wizard path)

## ⚡ Server Actions / APIs Triggered

- [[createClient]] (Instantiates the server-side Supabase connection)
- [[revalidate = 0]]: Explicitly prevents static page caching to ensure the registrant count and bracket status are always real-time.