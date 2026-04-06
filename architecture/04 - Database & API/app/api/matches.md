# ⚙️ /api/matches

**Type:** #api #database **Location:** `/Users/christianramos/Desktop/PitchSide/src/app/api/matches/route.ts`

## 📄 Expected Payload / Schema

- **GET**: Requires `gameId` in the URL search parameters.
- **POST (Body)**:
    - `action`: `'insert'`, `'update'`, or `'delete'`.
    - `gameId`: UUID of the parent event.
    - `matchId`: UUID of the specific match (recursive for update/delete).
    - `matchData`: Object containing scores, team names, status, and timer configuration.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Bypass**: Utilizes `createAdminClient()` (Service Role) for all database operations. This ensures that match scoring and bracket scheduling are handled with high authority, bypassing potential RLS restrictions that might block a standard user from editing match records.

## 🧪 Business Logic & Math

- **Polymorphic Match Dispatcher**:
    - The POST route acts as a multi-action controller, handling the entire lifecycle of a match from bracket insertion to final score lockdown.
- **Timer State Calibration**:
    - The `update` action is the primary conduit for the "Clock Relay." It accepts `timer_status`, `timer_started_at`, and `paused_elapsed_seconds`, which are then broadcasted to all projector displays to maintain sub-second accuracy across the facility.
- **Strict Seeding Metadata**:
    - When inserting, it explicitly maps `round_number` and `is_final` flags. This metadata is critical for the `StandingsTable` to differentiate between group-stage points and knockout-stage eliminations.
- **Normalized Return Data**:
    - Both GET and POST actions return a strictly selected set of columns (including `is_playoff`, `match_style`, and `field_name`), ensuring that the frontend receives a predictable data contract for rendering scoreboard components.

## 🔄 Returns / Side Effects

- **Returns**:
    - **GET**: `NextResponse.json({ data: Match[] })` ordered by creation time.
    - **POST**: `NextResponse.json({ data: Match })` on success.
- **Side Effects**:
    - Modifications to the `matches` table trigger immediate websocket updates via Supabase Realtime, causing all active `FieldProjector` and `LiveProjectorPage` instances to re-render with the latest scores or clock states.

---

**`/api/matches` is the "Live Scoreboard Authority" of the platform, providing the low-latency data bridge required for real-time tournament logistics.**