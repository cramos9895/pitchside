# ⚙️ seedPlayoffBracket

**Type:** #api #database #competition **Location:** `src/app/actions/playoff-actions.ts`

## 📄 Expected Payload / Schema

- **leagueId** (UUID): The target league to transition into playoffs.
- **topTeamsCount** (number): The number of teams advancing (typically 2 or 4).
- **Configuration Requirement**: The league must have a `playoff_start_date` defined in the `games` table.

## 🛡️ Security & Permissions

- **RLS Policy**: Protected by authenticated administrative session context.
- **Bypass**: Uses the standard `createClient()` (Server Client) but operates with write access to the `matches` table, which is typically restricted to staff roles.

## 🧪 Business Logic & Math

- **Redundant Standings Engine**:
    - To ensure seeding is bulletproof, the action implements a server-side mirror of the `StandingsTable` logic.
    - It iterates through all `completed` matches, calculating points (3/1/0) and goal metrics.
    - **Tie-Breaking Logic**: Strictly enforces the hierarchy of **Points ➔ Goal Difference (GD) ➔ Goals For (GF)**.
- **Deterministic Knockout Seeding**:
    - **Semi-Final Schema (Top 4)**: Automatically pairs `Seed #1 vs Seed #4` and `Seed #2 vs Seed #3`.
    - **Placeholder Generation**: Correctly inserts a "Finals" match record with teammate names as "Winner Semi 1" and "Winner Semi 2," allowing the bracket UI to render even before the semi-finals are played.
    - **Direct Final Schema (Top 2)**: Pairs `Seed #1 vs Seed #2` for leagues with smaller rosters or shorter durations.
- **Temporal Management**:
    - Automatically calculates start times for subsequent rounds. For Semi-Finals, it offsets the second match by 60 minutes and the final by 120 minutes from the `playoff_start_date` base.
- **Round-Number Indexing**:
    - Assigns reserved indexes (**99** for Semis, **100** for Finals) to ensure playoff matches are sorted at the end of the schedule regardless of their creation date.

## 🔄 Returns / Side Effects

- **Returns**: `{ success: true, count: number }` (the number of matches created).
- **Side Effects**:
    - Path revalidation for `/admin/games/[id]`, ensuring the Host Portal instantly displays the new bracket.
    - Permanent insertion of specialized `is_playoff: true` match records into the database.

---

**`seedPlayoffBracket` is the platform's "Championship Transition" logic, mathematically converting regular season performance into a structured knockout competition.**