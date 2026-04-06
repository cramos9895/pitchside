# ⚙️ seedTournament

**Type:** #api #database #utility **Location:** `src/app/actions/seed-tournament.ts`

## 📄 Expected Payload / Schema

- **gameId** (UUID): The target event to be populated with mock data.
- **Environment Check**: This action is strictly guarded and will only execute if `NODE_ENV === 'development'`.

## 🛡️ Security & Permissions

- **RLS Policy**: N/A (Server Action using administrative credentials).
- **Bypass**: Utilizes `adminSupabase.auth.admin.createUser` to generate authentic binary identities. This ensures that the platform's standard database triggers (like automatic profile creation via Postgres functions) are executed exactly as they would be for real users.
- **The Production Lock**: Implements a hard-coded "Kill Switch" at the entry point to prevent accidental pollution of production Auth or Database tables.

## 🧪 Business Logic & Math

- **Dynamic Team Generation**:
    - If `teams_config` is empty, the utility generates up to 10 "Dummy Squads" (Alpha, Bravo, etc.) with randomized colors and assigns them to the game record.
- **Batch Auth Creation**:
    - Generates **60 unique Auth users** in parallel batches of 10 to manage rate limits.
    - Each user is given a realistic email pattern (`dummyplayerN@testtournament.com`) and standard metadata.
- **Realistic Roster Simulation**:
    - **50 Team Players**: Distributes 50 players across the available squads (5 players per team).
    - **Captain Assignment**: Automatically designates the first player in every squad as `is_captain: true`.
    - **10 Free Agents**: Deliberately leaves 10 players with `team_assignment: null` to test the platform's Free Agent drafting and waitlist systems.
- **Waiver & Compliance Testing**:
    - Implements a **70% signing probability**. This creates a realistic "Pending Compliance" state in the admin dashboard where some players appear with signed waivers and others do not.

## 🔄 Returns / Side Effects

- **Returns**: `{ success: true, message: "Injected 60 synthetic players successfully." }` on completion.
- **Side Effects**:
    - Massive Auth table expansion (60 new entries).
    - Creation of 60 `bookings` records with `status: 'active'` and `payment_status: 'verified'`.
    - Multiple record insertions into the `waiver_signatures` table.

---

**`seedTournament` is the platform's "Stress Test Engine," allowing developers to instantly simulate a fully-booked tournament environment with complex player relationships and compliance states.**