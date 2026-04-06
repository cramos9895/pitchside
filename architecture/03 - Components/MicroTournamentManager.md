# 🧩 MicroTournamentManager

**Type:** #component **Location:** `src/components/admin/MicroTournamentManager.tsx`

## 📥 Props Received

- **game** (object): The tournament metadata (start time, field count, rules).
- **bookings** (array): The live roster of all registered players and teams.
- **matches** (array): The existing schedule of group and playoff games.
- **onUpdate** (function): A callback to refresh parent-level data.

## 🎛️ Local State & UI Logic

- **Triad Operational Layout**:
    - **1. Roster & Compliance Hub**:
        - Groups players into team-based accordions.
        - Features a **Compliance Widget** that calculates total player counts vs. missing waivers in real-time.
        - Includes a **Free Agent Waiting Room** for drag-and-drop team assignment of unplaced participants.
    - **2. Tournament Match Engine**:
        - The primary logic center for the event. Allows admins to generate a "Draft Schedule" (locally stored) where match times and fields can be fine-tuned before being "Published" (inserted) into the database.
        - Includes **Safety Locks** that prevent schedule regeneration once any score has been recorded.
    - **3. Live Standings**: Integrates a real-time `StandingsTable` that reflects match outcomes instantly.
- **Real-Time Pulse (Supabase)**:
    - Implements a dedicated `.channel()` subscription to the `matches` table. Any score update entered by other admins (or via a public kiosk) triggers an immediate `onUpdate` re-fetch, keeping the entire management dashboard in sync without manual refreshing.
- **Automated Bracket Seeding**:
    - Features a "Finalize Group Stage" transition bridge. Once all group matches are marked `completed`, the engine calculates the top $N$ seeds and generates the elimination bracket (Quarter-finals/Semi-finals) based on the tournament's `teams_into_playoffs` setting.
- **Compliance Integration**:
    - Directly embeds the `PlayerVerificationModal` for identity check-ins, photo ID captures, and manual waiver overrides during the registration phase.
- **Developer Utility Suite**:
    - Contains hidden "Seed" and "Cleanup" buttons (visible only in development) to inject 60 realistic dummy players and matches for testing bracket logic and projector displays.

## 🔗 Used In (Parent Pages)

- `src/app/admin/games/[id]/page.tsx` (When `game_type` is tournament/league)

## ⚡ Actions & API Triggers

- **`generateTournamentSchedule`**: The core algorithmic utility for building the round-robin or elimination matrix.
- **`seedTournament()` / `cleanupTournamentSeed()`**: Administrative hooks for data simulation.
- **`checkInPlayer()`**: Server action for finalizing participant eligibility.

---

**MicroTournamentManager is the platform’s most sophisticated "Command & Control" unit, centralizing roster compliance, match logic, and real-time standings into a single high-performance dashboard.**