# ⚙️ league-registration

**Type:** #api #database #competition  
**Location:** `src/app/actions/league-registration.ts`

## 📄 Expected Payload / Schema

- **registerCaptain**: `formData` (`leagueId`, `teamName`, `primaryColor`, `paymentChoice`).
- **registerFreeAgent**: `formData` (`leagueId`, `positions[]`).

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Captain Verification**: Automatically assigns the authenticated `user.id` as the `captain_id` in the `teams` table, ensuring that only the paying creator has administrative control over the squad.
- **Rollback Logic**: In `registerCaptain`, the action wraps the team creation and player registration. If the player registration fails, it manually deletes the newly created team record to prevent "Ghost Teams" without players from cluttering the marketplace.

## 🧪 Business Logic & Math

- **The "Registration Gatekeeper"**:
    - Enforces a hard **`registration_cutoff`** check. If the current server time exceeds the league's defined deadline, the action throws an error, preventing late entries even if the UI button is somehow active.
    - Validates league `status`, blocking entries if the competition is already `cancelled` or `completed`.
- **Polymorphic Entry Paths**:
    - **Competitive Path**: Creates a persistent record in the `teams` table and links the captain via `tournament_registrations`.
    - **Marketplace Path (Free Agent)**: Uses an **upsert** logic into `tournament_registrations` with `team_id: null`. This places the player into the "Global Draft Pool," making them visible to captains and house-team generators.
- **Position Preferences**: Captures an array of `preferred_positions` for free agents, which is utilized by the `[[house-team]]` logic for balanced squad generation.

## 🔄 Returns / Side Effects

- **Returns**: Standardized response `{ success: true, teamId?: string }` or throws a descriptive error.
- **UI Synchronization**: Triggers `revalidatePath` for the specific public league page `/leagues/${leagueId}`, ensuring the "Teams Registered" count and "Free Agent" lists update instantly for other browsing users.

---

**`league-registration` is the platform's "Onboarding Engine," mathematically converting individual user identities into structured competitive units within the league ecosystem.**