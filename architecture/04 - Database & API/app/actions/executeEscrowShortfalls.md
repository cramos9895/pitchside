# ⚙️ executeEscrowShortfalls

**Type:** #api #financial #database **Location:** `src/app/actions/execute-shortfalls.ts`

## 📄 Expected Payload / Schema

- **gameId** (UUID): The target league session.
- **Validation**: Requires the event to have `is_league: true` and a `team_roster_fee > 0`.

## 🛡️ Security & Permissions

- **RLS Policy**: Protected by administrative server-side context.
- **Bypass**: Uses `createAdminClient()` (Service Role) to aggregate roster-wide financial data and initiate off-session charges.
- **Vaulted Authorization**: Only executes charges against users who have explicitly authorized future usage via the `Stripe SetupIntent` during registration (marked by `stripe_payment_method_id`).

## 🧪 Business Logic & Math

- **The "Captain's Liability" Engine**:
    - This is the platform's primary mechanism for ensuring facilities are paid in full regardless of teammate attrition.
- **Shortfall Reconciliation Formula**:
    - `TotalTeammates = RosterSize - 1` (Excluding Captain).
    - `TotalCollected = InitialDeposit + (TotalTeammates * CustomInviteFee)`.
    - `BalanceDue = TeamRosterFee - TotalCollected`.
- **Automatic Off-Session Capture**:
    - If `BalanceDue > 0`, the system automatically identifies the team captain.
    - It creates and confirms a Stripe `PaymentIntent` for the remaining balance using `off_session: true`.
- **Metadata Tagging**:
    - Every shortfall charge is tagged with `type: escrow_shortfall` and the specific `team_assignment`, allowing facility owners to explain the charge to captains using the Stripe dashboard.

## 🔄 Returns / Side Effects

- **Returns**: A success status string or a pipe-delimited list of failure reasons per team (`failedCharges.join(' | ')`).
- **Side Effects**:
    - Real-time financial settlement for the facility.
    - Permanent log entries in the Stripe dashboard linked to the `team_assignment`.

---

**`executeEscrowShortfalls` is the platform's "Financial Integrity Enforcer," guaranteeing that total roster fees are met by shifting the weight of under-registration from the facility to the team captain.**