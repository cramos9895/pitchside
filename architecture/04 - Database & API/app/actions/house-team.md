# ⚙️ house-team

**Type:** #api #database #financial **Location:** `src/app/actions/house-team.ts`

## 📄 Expected Payload / Schema

- **gameId** (UUID): The target event ID where free agents are waiting to be rostered.
- **Action Context**: Triggered by a Host or Admin from the "Free Agent Pool" view.

## 🛡️ Security & Permissions

- **RLS Policy**: Protected by server-side role verification.
- **Role Requirement**: Strictly enforces that the caller has a profile role of `admin` or `master_admin`. Standard 'host' or 'user' roles are denied execution.
- **Bypass**: Employs `createAdminClient()` (Service Role) to perform bulk updates on the `bookings` table, bypassing potentially restrictive player-level RLS.

## 🧪 Business Logic & Math

- **The "Automated Squad Builder"**:
    - **Roster Assembly**: Identifies all records in the `bookings` table with `status: 'free_agent_pending'` for the specific game.
    - **Dynamic Configuration Injection**: Dynamically calculates the `newTeamNumber` by checking the existing `teams_config` length. It then appends a new squad (e.g., "House Team 3") to the game's JSONB metadata.
- **Mass Off-Session Settlement**:
    - Iterates through the gathered free agent list.
    - **Stripe Payout Logic**: Retrieves the user's vaulted `stripe_customer_id` and `stripe_payment_method_id`.
    - Executes a **`confirm: true`** and **`off_session: true`** PaymentIntent charge for the game's full `price`.
    - **Conditional Rostering**: A player is only officially moved to the new team assignment if the Stripe transaction is successful or in a `processing` state.
- **Color Cycling Algorithm**:
    - Includes a helper `getNextTeamColor` that uses a modulo operation on a palette of 8 high-contrast colors, ensuring new house teams are visually distinct in the `LiveProjectorPage` and `TournamentDisplay`.

## 🔄 Returns / Side Effects

- **Returns**: A summary response containing:
    - `successful`: Count of players successfully charged and rostered.
    - `failed`: Count of card declines or missing vault credentials.
    - `failures`: An array of strings detailing which specific players failed and why.
- **Side Effects**:
    - Permanent insertion of financial transaction logs in the Stripe Dashboard with `type: 'house_team_auto_draft'` metadata.
    - Real-time updates to the game's `teams_config` registry.

---

**`house-team` is the platform's "Free Agent Liquidator," providing a one-click administrative solution for converting unassigned individuals into a fully-paid competitive squad.**