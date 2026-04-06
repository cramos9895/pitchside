# ⚙️ cancel-player-registration

**Type:** #api #database #maintenance **Location:** `src/app/actions/cancel-player-registration.ts`

## 📄 Expected Payload / Schema

- **cancelPlayerRegistration**: `bookingId` (UUID) of the specific reservation.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Ownership Verification**: Implements a strict identity check. It fetches the booking record first and ensures the `user_id` matches the authenticated `user.id`. This prevents malicious users from attempting to cancel other participants' seats via ID manipulation.
- **Service Role Authority**: Utilizes `createAdminClient()` to bypass standard participant RLS. This is critical for updating `payment_status` and triggering Stripe refunds, which are administrative operations that should not be performable via the standard client-side policy.

## 🧪 Business Logic & Math

- **The "Refund Scoping" Engine**:
    - This is the platform's primary **Financial Logic Gate**. It executes a three-tier eligibility check before attempting a refund:
        1. **Global Toggle**: Checks `games.is_refundable`.
        2. **Temporal Cutoff**: Compares `new Date()` against `games.refund_cutoff_date`. If the server time is past the cutoff, the status is updated to `cancelled`, but the financial refund is automatically blocked.
        3. **Transaction Status**: Verifies that the payment has been fully settled (`payment_status === 'verified'`) before initiating the Stripe refund call.
- **Transactional State Matrix**:
    - **`free_agent_pending`**: Since these entries only exist as vaulted payment methods, the action simply flips the status to `cancelled` without triggering Stripe.
    - **Confirmed Roster**: Triggers an atomic update setting `status: 'cancelled'` and `payment_status: 'refunded'`.
- **Stripe Reconciliation**:
    - Calls `stripe.refunds.create` using the stored `stripe_payment_intent_id`. It handles both `succeeded` and `pending` statuses from Stripe to ensure the database stays in sync even if Stripe has a processing delay.

## 🔄 Returns / Side Effects

- **Returns**: Standardized response `{ success: true, message: string }` with context-aware messages (e.g., "Refund initiated" vs. "Cancelled without refund due to cutoff").
- **System-Wide Revalidation**: (Implicit) As this updates the `bookings` table, any dashboard or game-roster components using Supabase Realtime or `revalidatePath` hooks will instantly reflect the vacated seat and updated "Current Players" count.

---

**`cancel-player-registration` is the platform's "Inventory Reconciliation Bridge," mathematically balancing the physical occupancy of a game with complex financial refund policies and temporal deadlines.**