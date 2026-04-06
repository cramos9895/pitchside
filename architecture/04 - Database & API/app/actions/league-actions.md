# ⚙️ league-actions

**Type:** #api #database #competition **Location:** `src/app/actions/league-actions.ts`

## 📄 Expected Payload / Schema

- **cancelMatch**: `matchId` (UUID), `leagueId` (UUID).
- **rescheduleMatch**: `matchId` (UUID), `leagueId` (UUID), `newStartTime` (ISO String), `fieldName` (String).
- **generateLeagueSchedule**:
    - `leagueId`: (UUID) Target competition.
    - `teams`: (String Array) List of participating team names.
    - `startDate`: (ISO String) Commencement of the season.
    - `weeks`: (Number) Duration of the regular season.
    - `facilityId`: (UUID) Physical host for conflict checking.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via the standard `createClient`.
- **The "Collision Guard"**: Strictly enforces physical resource integrity. Every modification to a match time (`rescheduleMatch` or `generateLeagueSchedule`) triggers an internal `checkOverlap` query. This query audits both existing **Matches** (fixed league slots) and **Games** (transient pickup sessions) within a $\pm$ 120-minute temporal buffer to prevent double-booking a field.
- **Administrative Lock**: These actions are designed for the Host Portal, ensuring that only facility owners or league managers can manipulate the competitive calendar.

## 🧪 Business Logic & Math

- **Round-Robin "Circle Method" Engine**:
    - The `generateLeagueSchedule` function implements a classic round-robin pairing algorithm.
    - **Bye Logic**: If an odd number of teams is provided, the engine automatically injects a "Bye" team (`-1`) to ensure every team has a balanced schedule.
    - **Weekly Rotation**: Uses a fixed-position rotation strategy to ensure that every team eventually plays every other team once during the season.
- **Temporal Intersection Math**:
    - `checkOverlap` executes the boundary check: `ProposedStart < ExistingEnd AND ProposedEnd > ExistingStart`.
    - It dynamically handles `end_time` logic: if a specific duration isn't found, it defaults to a **60-minute buffer** to maintain facility flow.
- **Auto-Incrementing Kickoffs**:
    - During batch generation, the engine automatically increments kickoff times by 1-hour increments for each pairing within a game day to maximize field utilization.

## 🔄 Returns / Side Effects

- **Returns**: Standardized response `{ success: true }`.
- **System-Wide Revalidation**: Triggers `revalidatePath` for `/admin/games/${leagueId}`, ensuring that the host's administrative schedule view, tournament brackets, and live standings reflect the new calendar state instantly.

---

**`league-actions` is the platform's "Competitive Orchestrator," providing the algorithmic and safety logic needed to manage complex season-long schedules without physical resource conflicts.**