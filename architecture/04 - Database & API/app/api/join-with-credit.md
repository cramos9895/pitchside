# ⚙️ /api/join-with-credit

**Type:** #api #database **Location:** `src/app/api/join-with-credit/route.ts`

## 📄 Expected Payload / Schema

- **gameId** (UUID): The target event for credit redemption.
- **note** (string): Optional teammate request or join note.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is required via `supabase.auth.getUser()`.
- **Bypass**: Uses standard RLS-bound `supabase` client for most operations, but enforces strict server-side validation of the `free_game_credits` field.
- **The Ban Enforcer**: Implements the platform-standard check for `is_banned` and `banned_until` before processing any redemption logic.

## 🧪 Business Logic & Math

- **MVP Credit Redemption**:
    - Specifically targets the **`free_game_credits`** column (integer-based "tokens" given for MVP wins or referrals), distinct from the dollar-based `credit_balance`.
    - Verification: Checks if `profile.free_game_credits >= 1`.
- **Availability Enforcement**:
    - Unlike the standard join API, this route does not support waitlisting. It strictly checks if `current_players < max_players` and if the game is not cancelled.
- **Manual Transaction Rollback**:
    - The API follows a "Deduct-then-Insert" pattern.
    - Logic: It decrements the credit first. If the `bookings` table insertion fails (e.g., due to a constraint or network error), it explicitly triggers a **rollback update** to restore the user's original credit count, preventing a "loss" of credit on failed transactions.
- **Verified Settlement**:
    - Successful redemptions are immediately flagged in the database as `status: 'paid'` and `payment_status: 'verified'`, bypassing the 'pending' verification step required for manual Zelle/Venmo payments.

## 🔄 Returns / Side Effects

- **Returns**: `NextResponse.json({ success: true, message: 'Joined with Credit!' })` on success.
- **Email Trigger**: Calls `sendNotification` with the `confirmation` type, specifically tagging the `amountCharged` as "Redeemed Credit" for the user's receipt.

---

**`/api/join-with-credit` is a streamlined, low-latency transaction path designed to reward player engagement by bypassing the standard financial checkout flow.**