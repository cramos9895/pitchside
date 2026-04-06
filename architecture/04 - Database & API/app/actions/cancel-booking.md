# ⚙️ cancel-booking

**Type:** #api #database #maintenance  
**Location:** `src/app/actions/cancel-booking.ts`

## 📄 Expected Payload / Schema

- **cancelBooking**: `bookingId` (UUID) of the target reservation.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Authorization Hierarchy**: Implements a three-pillar ownership check. Cancellation is strictly forbidden unless the caller is either the **Player** (`user_id`), the **Payer** (`buyer_id`), or a **Super Admin** (`system_role: 'master_admin'`). This ensures that guest bookings can be managed by the person who paid for them.
- **Admin Privacy Bypass**: Utilizes `createAdminClient()` to perform pricing lookups and status updates. This is critical for reading the `games` table and updating `profiles` balances, operations which are often restricted for standard participants.

## 🧪 Business Logic & Math

- **The "Cutoff Engine" Hierarchy**:
    - This is the platform's primary **Refund Eligibility Gate**. It evaluates refund conditions in a specific priority order:
        1. **Date-Based Lock**: If `refund_cutoff_date` is set, it becomes the hard global deadline.
        2. **Rolling Window**: Failing a fixed date, it checks if `hoursRemaining > refund_cutoff_hours`.
        3. **Global Policy**: If no specific constraints are set but `is_refundable` is true, the refund is automatically authorized.
- **The "Internal Wallet" Refund Strategy**:
    - Unlike tournament cancellations (which may trigger Stripe), this action executes an **Internal Credit Refund**.
    - **Buyer Routing**: It specifically identifies the `buyer_id`. If a user bought multiple spots for friends, any cancellations will credit the **original payer's** `credit_balance` rather than the guest's profile.
- **Audit-Safe Soft Deletion**:
    - Instead of a hard row deletion, the record is transitioned to `status: 'cancelled'` and `roster_status: 'dropped'`. This preserves the historical audit trail for financial reconciliation while instantly vacating the roster spot for waitlisted players.

## 🔄 Returns / Side Effects

- **Returns**: Standardized response `{ success: true, refunded: boolean }`.
- **Side Effects**:
    - **Financial Reconciliation**: Updates the `credit_balance` column in the `profiles` table for the designating buyer.
    - **Roster Inventory**: Vacating the spot allows the `[[leave]]` or `[[sync-counts]]` logic to automatically manage waitlist promotions if triggered.

---

**`cancel-booking` is the platform's "Internal Ledger Reconciler," providing the mathematical logic needed to handle participant withdrawals and player-to-buyer credit refunds without external Stripe overhead.**