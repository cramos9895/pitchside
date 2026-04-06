# ⚙️ tournament-registration

**Type:** #api #database #competition  
**Location:** `src/app/actions/tournament-registration.ts`

## 📄 Expected Payload / Schema

- **registerTournamentTeam**: `formData` (`tournament_id`, `team_name`, `primary_color`, `liability_acknowledged`).
- **registerTournamentFreeAgent**: `formData` (`tournament_id`, `positions[]`).
- **leaveTournament**: `registrationId` (UUID), `tournamentId` (UUID).

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **The "One-Man-One-Team" Lock**: Implements a strict duplicate registration check. It queries `tournament_registrations` for any existing entry by the `user.id` for the specific match or league, preventing a single user from occupying multiple roster spots or captaining multiple teams in the same competition.
- **Financial Liability Gate**: Forces users to explicitly toggle `liability_acknowledged`, which serves as a legal/financial handshake before the team is allowed to be written to the database.
- **Ownership Verification**: In `leaveTournament`, the action fetches the registration record first to ensure the `user_id` matches the authenticated caller, preventing unauthorized registration tampering.

## 🧪 Business Logic & Math

- **Polymorphic Tournament Targeting**:
    - This action treats **Games** (One-off events) and **Leagues** (Season-long play) as polymorphic "Tournaments."
    - It executes a **`gameCheck`** strategy: if the ID exists in the `games` table, it assigns the `game_id` foreign key; otherwise, it defaults to `league_id`. This allows the UI to use a single "Register" component for different competition types.
- **Roster Role Mapping**:
    - Automatically assigns `role: 'captain'` for team creators and `role: 'player'` for free agents.
    - This distinction is used by the `[[house-team]]` and `[[draft-player]]` engines to determine who has "Drafting Authority" vs. who is available to be drafted.
- **State Cleanup Logic**:
    - If a user leaves a tournament, it executes a clean `DELETE` on the mapping table. If the user was the last remaining member of a team, the team persists as an "Empty Squad" which can later be occupied or liquidated by an admin.

## 🔄 Returns / Side Effects

- **Returns**: Standardized response `{ success: true, teamId?: string }` or throws a descriptive error.
- **System-Wide Revalidation**: Performs **Multi-View Synchronization** by purging the cache for:
    - `/schedule`: Updating the public field availability and game lists.
    - `/dashboard`: Updating the player's personal "My Events" view.
    - `/admin/games/[id]`: Updating the host's administrative roster panel.

---

**`tournament-registration` is the platform's "Bracket Entry Bridge," providing the polymorphic logic needed to transition users into competitive team structures regardless of the tournament's underlying data model.**