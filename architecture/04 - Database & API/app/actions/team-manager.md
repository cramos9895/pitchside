# ⚙️ team-manager (HouseTeam / Drafting)

**Type:** #api #database #competition **Location:** `[[src/app/actions/house-team.ts]]` / `[[src/app/actions/draft-player.ts]]`

## 📄 Expected Payload / Schema

- **buildHouseTeam**: `gameId` (UUID).
- **draftFreeAgent**: `registrationId` (UUID) and `teamId` (UUID).
- **Toggle Free Agents**: `teamId` (UUID) and `isAccepting` (boolean).

## 🛡️ Security & Permissions

- **RLS Policy**: Actions are server-side and protected by explicit role-based access checks.
- **Captain Verification**: The `draftFreeAgent` action performs a manual check in the registry to confirm that the requester holds the `role: 'captain'` for the target `team_id` before allowing the draft.
- **Administrative Restriction**: `buildHouseTeam` requires the calling user to have a profile role of `admin` or `master_admin`, as it involves system-wide financial transactions.
- **Bypass**: Utilizes `createAdminClient()` (Service Role) to execute bulk updates to the `bookings` table that would otherwise be blocked by row-level security.

## 🧪 Business Logic & Math

- **The "Vaulted Auto-Draft"**:
    - `buildHouseTeam` identifies all players with `status: 'free_agent_pending'`.
    - It automatically creates a new team entry in the `games.teams_config` JSONB column (e.g., "House Team 3").
    - It iterates through the free agents and executes **Off-Session Card Charges** for the game's price.
    - **Success-Only Rostering**: Only players with successful Stripe settlements are updated to `status: 'paid'` and assigned to the new team; failed transactions are logged for administrative intervention.
- **Team Color Cycling**:
    - Implements a cyclic helper `getNextTeamColor` that assigns a high-contrast aesthetic to newly created house squads based on their index (e.g., Team 1 = Red, Team 2 = Blue).
- **Free Agent Visibility**:
    - `toggleAcceptingFreeAgents` allows captains to broadcast their squad's availability to the public marketplace, dynamically updating the `teams` metadata.
- **Drafting Integrity**:
    - `draftFreeAgent` performs a pre-flight check to ensure a player hasn't already been scooped up by another captain before executing the roster move.

## 🔄 Returns / Side Effects

- **Returns**: A detailed summary object `{ successful: number, failed: number, failures: string[] }`, providing immediate feedback on bulk draft results.
- **Side Effects**:
    - Triggers `revalidatePath()` for both the public-facing tournament page and the private admin dashboard.
    - Permanent financial entries created in the Stripe dashboard with `type: 'house_team_auto_draft'`.

---

**`team-manager` logic bridges the gap between passive player registration and active tournament logistics, enabling both automated and captain-led roster construction.**