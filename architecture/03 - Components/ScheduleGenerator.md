# 🧩 ScheduleGenerator

**Type:** #component **Location:** `src/components/admin/ScheduleGenerator.tsx`

## 📥 Props Received

- **gameId** (string): The UUID of the parent event (League or Tournament).
- **teams** (array): An array of `TeamConfig` objects (names and colors) to be included in the matrix.
- **isLeague** (boolean): Flag to toggle between Week-based (League) and Minute-based (Tournament) scheduling logic.
- **totalWeeks** (number): The duration of the season for league-mode calculations.
- **onScheduleSaved** (function): Callback triggered after matches are successfully inserted into Supabase.

## 🎛️ Local State & UI Logic

- **Smart Time Detection**:
    - On component mount, the generator fetches the parent game's `start_time` and `end_time`.
    - It implements a specialized duration calculator that handles 24-hour clock overflows (e.g., a 10 PM to 1 AM booking), ensuring the `duration` state accurately reflects the facility window.
- **The "Circle Method" Algorithm**:
    - Implements a robust round-robin rotation engine. For any given set of teams, it creates an index queue, pins the first team, and rotates the others to ensure exhaustive and unique pairings for every round.
    - **Bye Logic**: Automatically detects odd team counts and handles "Bye" rounds internally to prevent empty match records.
- **Dual-Mode Scheduling Logic**:
    - **Tournament Mode**: Prioritizes "Time Slots." It calculates how many matches can fit concurrently across $N$ fields within the total duration, accounting for `warmup` and `gameLength`.
    - **League Mode**: Prioritizes "Week Cycles." It generates enough round-robin cycles to satisfy the `totalWeeks` requirement, placing matches into sequential `round_number` buckets.
- **Transactional Preview Layer**:
    - Instead of immediate DB commits, the generator renders a **Live Preview Pane**. This allows admins to visually verify the VS. matchups and time labels (e.g., "+70 mins" or "Week 3") before triggering the final database batch insert.
- **Safety Boundaries**:
    - Includes a `safetyCounter` to prevent infinite loops during complex matrix generation with high team counts.

## 🔗 Used In (Parent Pages)

- `src/components/admin/AdminLeagueControl.tsx`
- `src/components/admin/MicroTournamentManager.tsx`

## ⚡ Actions & API Triggers

- **`saveSchedule`**: Performs a bulk `insert` of the generated match objects into the `matches` table.
- **`router.refresh()`**: Triggers a Next.js server component refresh to reflect the new schedule in the parent feed.

---

**ScheduleGenerator is the platform's primary mathematical engine for competition logistics, transforming a list of participants into a perfectly balanced, round-robin playing schedule.**