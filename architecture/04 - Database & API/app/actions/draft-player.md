# ⚙️ draft-player

**Type:** #api #database #competition **Location:** `src/app/actions/draft-player.ts`

## 📄 Expected Payload / Schema

- **draftFreeAgent**:
    - `registrationId` (UUID): The specific player's enrollment record.
    - `teamId` (UUID): The target squad performing the draft.
- **toggleAcceptingFreeAgents**:
    - `teamId` (UUID): The squad's high-level registry ID.
    - `isAccepting` (boolean): Flag to broadcast availability to the free agent pool.

## 🛡️ Security & Permissions

- **RLS Policy**: Protected by a dual-client security model.
- **Captain Gatekeeper**: Strictly verifies that the authenticated user holds the `role: 'captain'` for the specific `teamId` in the `tournament_registrations` table. Standard players or captains from other teams are denied.
- **Bypass**: Utilizes `createAdminClient()` (Service Role) to perform the final roster move. This is necessary as RLS typically prevents one user (the captain) from modifying the database record of another user (the free agent).

## 🧪 Business Logic & Math

- **The "Waiver Wire" Logic**:
    - **Race Condition Prevention**: Before executing the draft, the action performs a "Data Integrity" check to ensure the free agent still has `team_id: null`. If another captain has already drafted them, the request is rejected with a **"Already drafted"** error.
- **Status Promotion**:
    - Successfully drafted players have their record updated to `status: 'drafted'` and their `team_id` linked to the target squad.
- **Visibility Control**:
    - `toggleAcceptingFreeAgents` modifies the `teams` table metadata, allowing captains to "Opt-In" to the draft pool, which in turn filters the public-facing free agent marketplace.

## 🔄 Returns / Side Effects

- **Returns**: Returns the `updatedData` object (single registration record) or a success message.
- **Side Effects**:
    - Triggers a **Triple Path Revalidation**:
        1. `/tournaments/[id]/team/[team_id]`: Refreshes the squad's roster view.
        2. `/admin/(dashboard)/games/[id]`: Updates the Host Portal's master registration list.
        3. `/admin`: Clears the high-level layout cache for administrative dashboards.

---

**`draft-player` is the platform's "Roster Construction" logic, empowering squad captains to actively build their teams from the waitlist and free agent marketplace.**