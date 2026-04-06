# 📺 TournamentDisplay

**Type:** #page / #projector **Location:** `src/app/admin/games/[id]/display/page.tsx`

## 🎛️ Local State & UI Logic

- **Automated View Carousel**:
    - The page implements a non-interactive 15-second rotation cycle between two primary broadcast views: **Standings** (Leaderboard) and **Matches** (Live Scores + Upcoming Fixtures). This ensures that fans and players in a facility can consume all essential tournament data without manual intervention.
- **High-Fidelity "ESPN" Style Header**:
    - Features the tournament's title with a pulsing **"Live"** indicator, the current facility time, and the competition style (e.g., Round Robin, Elimination).
- **Dynamic Leaderboard Visualization**:
    - Integrates the `StandingsTable` in a specialized `viewOnly` mode. It automatically highlights the "Playoff Advancement" zone (the top $N$ teams) with a high-contrast accent color to clarify the qualifying threshold.
- **Side-by-Side Match Tracker**:
    - In the Match View, the display split-screens between:
        - **Current Games**: Shows massive team names and live scores with a pulsing activity indicator.
        - **Upcoming Fixtures**: A chronological list of the next 6 scheduled matches, including start times and assigned field names.
- **Animated Branding Ticker**:
    - A persistent, CSS-animated bottom ticker scrolls critical metadata and facility-wide announcements (e.g., "Check-in 5 mins before kickoff") across the screen, mimicking professional sports broadcasts and providing a high-premium aesthetic.
- **Intermission Detection**:
    - If no matches are currently active or scheduled, the page renders a stylized "Intermission" state with a clock icon, preventing a blank screen during tournament breaks.

## 🔗 Used In (Navigation)

- Accessed via the admin URL `/admin/games/[id]/display`.
- Designed for field-side TVs and lobby projectors controlled by facility administrators.

## ⚡ Actions & API Triggers

- **`fetchData()`**: A periodic and event-triggered refresh function that re-validates the entire tournament state.
- **Supabase Realtime Channel**: Syncs on `matches` and `games` changes specifically filtered for the current `gameId`.

---

**TournamentDisplay is the "Facility Broadcast Engine," engineered for high-distance legibility and professional-grade live updates in a commercial sports environment.**