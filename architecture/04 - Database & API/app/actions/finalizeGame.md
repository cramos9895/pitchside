# ⚙️ finalizeGame

**Type:** #api #database #competition **Location:** `src/app/actions/finalize-game.ts`

## 📄 Expected Payload / Schema

- **gameId** (UUID): The target event to close out.
- **winningTeamName** (string | null): The name of the team granted victory status.
- **mvpPlayerId** (UUID | null): The profile ID of the player selected as MVP.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Administrative Restriction**: While the action currently performs a basic auth check, it is designed for use within the administrative Host Portal. The `createClient()` (Server Client) is used, meaning standard RLS applies unless further elevated.

## 🧪 Business Logic & Math

- **The "Match Close-Out" Lifecycle**:
    1. **Status Transition**: Moves the `games` record from `active` ➔ `completed`, locking the match details from further modification.
    2. **Two-Pass Roster Reconciliation**:
        - **Pass 1 (Reset)**: Forcefully sets `is_winner: false` for every booking associated with the `gameId`. This ensures a clean slate.
        - **Pass 2 (Assignment)**: Identifies all bookings where `team_assignment === winningTeamName` and sets `is_winner: true`.
    3. **Achievement Loop**:
        - Retrieves the MVP's current profile.
        - **MVP Stat Tracking**: Increments the `mvp_awards` counter by 1.
        - **Financial Reward**: If the game configuration has `has_mvp_reward: true`, it also increments the **`free_game_credits`** bucket.
- **Deterministic Rewards**: Logic ensures that MVP credits are only awarded if explicitly configured by the facility, preventing unintended "Free Game" spam.

## 🔄 Returns / Side Effects

- **Returns**: `{ success: boolean, error?: string }`.
- **Global Cache Purge**: Triggers a massive `revalidatePath()` across the entire platform:
    - `/dashboard`: To update the player's game history.
    - `/leaderboard`: To reflect new MVP and Win-Loss ratios.
    - `/profile`: To update personal achievement badges.
    - `/admin`: To refresh the Host's completed games list.

---

**`finalizeGame` is the platform's "Results Authority," mathematically converting on-field performance into permanent database achievements and financial credits.**