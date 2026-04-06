# ⚙️ /api/leave

**Type:** #api #database #financial **Location:** `src/app/api/leave/route.ts`

## 📄 Expected Payload / Schema

- **gameId** (UUID): The target event the user is withdrawing from.
- **Action Context**: Triggered when a player clicks "Leave Game" in the Player Command Center.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Bypass**: Employs `createAdminClient()` (Service Role) to perform cross-user state changes (like promoting a waitlist player) and financial wallet updates that would otherwise be blocked by row-level security.
- **Ownership Verification**: Automatically identifies the user's latest non-cancelled booking to prevent stale state manipulation.

## 🧪 Business Logic & Math

- **The Cutoff Hierarchy Engine**:
    - Implements a priority-based refund eligibility check:
        1. **Explicit Date**: If `refund_cutoff_date` is set, it is the absolute deadline.
        2. **Rolling Window**: Falls back to `refund_cutoff_hours` (e.g., must leave > 24h before kickoff).
- **Squad-Aware Refund Routing**:
    - **Logic**: If the current booking has a `buyer_id` (indicating it was part of a group purchase), the refund amount is mathematically injected into the **buyer's** `credit_balance` instead of the departing player's. This ensures financial integrity for squad transactions.
- **The "Waitlist Domino" Effect**:
    - When a `paid` or `active` player leaves, the API immediately triggers a search for the oldest `waitlist` record (`order BY created_at ASC`).
    - **Auto-Promotion**: The top waitlist player is automatically transitioned to `status: 'paid'` and `roster_status: 'confirmed'`.
- **Transactional Consistency**:
    - Marks the record with both `status: 'cancelled'` and `roster_status: 'dropped'` to ensure they are excluded from all leaderboard, roster, and projector calculations.

## 🔄 Returns / Side Effects

- **Returns**: `NextResponse.json({ success: true, refunded: boolean, message: string })`.
- **Dual Notification Triggers**:
    - **Sender**: Dispatches a `cancellation` email summarizing the refund status.
    - **Promotion**: If a waitlist player is promoted, dispatches a `waitlist_promotion` email with a "Claim Spot" call-to-action.

---

**`/api/leave` is the platform's "Logistics Balancing Engine," elegantly managing the financial and operational ripple effects of player withdrawals.**