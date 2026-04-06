# 🧩 StandingsTable

**Type:** #component **Location:** `src/components/admin/StandingsTable.tsx`

## 📥 Props Received

- **gameId** (string): The UUID of the parent event.
- **teams** (array): The raw `teams_config` collection defining team names and colors.
- **matches** (array): The complete array of match objects, including scores and completion statuses.
- **viewOnly** (boolean): A UI-scaling flag that reduces padding and font sizes for use in "Live Projector" or "Field Display" views.
- **highlightTeamId** (string): Optional UUID of a team to be visually emphasized (e.g., the user's team).

## 🎛️ Local State & UI Logic

- **Real-Time Ranking Algorithm**:
    - The component utilizes a high-performance `useMemo` hook to perform a single-pass reduction of the `matches` data.
    - **Points Logic**: Awards 3 points for a win, 1 for a draw, and 0 for a loss.
    - **Tie-Breaking Protocol**: Implements a standard FIFA-style tie-breaking hierarchy: **Points ➔ Goal Difference (GD) ➔ Goals For (GF)**.
- **Automatic Grouping (Pools)**:
    - Scans the match list for `group_name` metadata. If a tournament is split into pools, the component automatically generates multiple distinct tables, ensuring organizational clarity without needing manual configuration.
- **Projector-Ready Scaling**:
    - Features a polymorphic styling engine. When `viewOnly` is enabled, the component switches to a high-density, low-friction layout (`text-[10px]` headers, reduced padding) optimized for distance legibility on facility displays.
- **Context-Aware Styling**:
    - Uses `isHighlighted` logic to apply a `pitch-accent` border and background to a specific row, allowing players in the Command Center to instantly locate their squad in the standings.
- **Data Integrity Fallback**:
    - Includes logic to handle empty match states (e.g., before brackets are generated), gracefully rendering all teams with zeroed stats to ensure the UI remains active during the pre-kickoff phase.

## 🔗 Used In (Parent Pages)

- `src/components/admin/MicroTournamentManager.tsx` (Live bracket management)
- `src/components/public/PlayerCommandCenter.tsx` (Personal tournament tracker)
- `src/app/games/[id]/live/page.tsx` (Pickup & Tournament projector)
- `src/app/admin/games/[id]/display/page.tsx` (Facility broadcast feed)

---

**StandingsTable is the mathematical "Nerve Center" of the PitchSide competitive engine, transforming raw match results into a real-time, professional leaderboard across all platform surfaces.**