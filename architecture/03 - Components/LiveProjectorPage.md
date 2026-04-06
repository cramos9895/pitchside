# 📡 LiveProjectorPage

**Type:** #page / #projector **Location:** `src/app/games/[id]/live/page.tsx`

## 🎛️ Local State & UI Logic

- **Precision Timer Architecture**:
    - Employs a "Bulletproof Ref" pattern to maintain time accuracy. A `useRef` tracks the live `game` state, while a 1-second `setInterval` heartbeat calculates `timeRemaining` by comparing the current timestamp against the server-provided `timer_started_at`.
    - **Sync Correction**: Instead of drifting with standard JS intervals, the timer re-bases its calculation every second using the actual system clock, ensuring perfect synchronization across multiple screens in a facility.
- **Tripwire Real-Time Synchronization**:
    - Establishes a Supabase Realtime channel (`live-projector-[id]`) with filters on both the `games` and `matches` tables.
    - Any change (score update, timer toggle, roster change) acts as a "tripwire" that triggers an atomic `refreshData()` call, keeping the display perfectly in sync with the administrator's console.
- **Polymorphic Mode Dispatcher**:
    - The page dynamically shifts its entire layout based on the `view_mode` database field:
        - **`single`**: Maximizes the clock and current matchup for 1v1 or team-vs-team pickup games.
        - **`king`**: A split-screen layout optimized for "Winner Stays" rotations, showing the live match, current win streaks (via `StandingsTable`), and the next waiting challenger.
        - **`tournament`**: A high-density "Operations Center" showing concurrent matches across all fields, upcoming fixtures, and the complete group-stage leaderboard.
- **Visual Alert System**:
    - Implements a low-time warning system. At **60 seconds**, the clock transitions to **Yellow**. At **0 seconds**, the UI enters a high-visibility state with **Flashing Red** text and a large "TIME!" watermark.
- **Auto-Rotation & Queue Logic**:
    - For tournaments, the page automatically identifies the "Current Round" by scanning for the first round with non-completed matches. It derives "Up Next" and "Sitting Out" lists on-the-fly, helping players self-organize without staff intervention.

## 🔗 Used In (Navigation)

- Accessed via the public URL `/games/[id]/live`.
- Linked from the **Admin Game Dashboard** as the "Launch Projector" action.

## ⚡ Actions & API Triggers

- **`refreshData()`**: A unified fetcher that pulls fresh event metadata and match logs.
- **Real-Time Subscriptions**: Listens for `INSERT`, `UPDATE`, and `DELETE` events on event-related tables.

---

**LiveProjectorPage is the "Digital Pulse" of the facility floor, designed for high-distance legibility and zero-latency technical accuracy during competitive play.**