# ⚙️ draft-free-agent

**Type:** #api #database #financial **Location:** `src/app/actions/draft-free-agent.ts`

## 📄 Expected Payload / Schema

- **bookingId** (UUID): The unique identifier for the player's pending registration.
- **teamAssignment** (string): The name of the squad the player is being drafted into.

## 🛡️ Security & Permissions

- **RLS Policy**: Protected by authenticated session context.
- **Bypass**: Utilizes `createAdminClient()` (Service Role) to perform the final status update and roster assignment, bypassing standard blockages on editing other users' bookings.
- **Vaulted Authorization**: Relies on the `stripe_payment_method_id` captured during the player's initial "Join as Free Agent" flow, which authorizes the platform to charge the card off-session upon being drafted.

## 🧪 Business Logic & Math

- **The "Charge-to-Draft" Protocol**:
    - This is a high-integrity transaction. The platform **does not** roster the player until financial settlement is initiated.
    - **Availability Guard**: Verifies `booking.status === 'free_agent_pending'`. This prevents "Double Drafting" if two administrators or captains attempt to pull the same player simultaneously.
- **Pre-Flight Capacity Check**:
    - Before contacting Stripe, the action fetches the `games.teams_config`.
    - It performs a real-time server count of active bookings for the target squad. If the draft would exceed the squad's `limit`, the action throws an error, saving the user from a successful charge on a full team.
- **Financial Settlement**:
    - Executes a Stripe `PaymentIntent` with **`off_session: true`** and **`confirm: true`**.
    - **Metadata Auditing**: Attaches `type: 'free_agent_draft'` and the `game_id` to the Stripe record, ensuring the facility owner can reconcile the automatic charge later.
- **Outcome-Based Persistence**:
    - The database only transitions the player to `status: 'paid'` if Stripe returns a `succeeded` or `processing` status. If the card is declined, the player remains in the free agent pool and a descriptive error is returned to the UI.

## 🔄 Returns / Side Effects

- **Returns**: `{ success: true, message: 'Draft Successful and Card Charged!' }` on success.
- **Cache Invalidation**: Triggers `revalidatePath` for:
    - `/free-agents`: To remove the drafted player from the public pool.
    - `/dashboard`: To update the player's personal schedule.

---

**`draft-free-agent` is the platform's "Instant Settlement" engine, mathematically linking squad roster spots to successful financial transactions in one atomic action.**