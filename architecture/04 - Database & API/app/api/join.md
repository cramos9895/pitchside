# ⚙️ /api/join

**Type:** #api #database **Location:** `src/app/api/join/route.ts`

## 📄 Expected Payload / Schema

- **gameId** (UUID): The target event to join.
- **note** (string): Optional teammate request or join note.
- **paymentMethod** (string): 'venmo' | 'zelle' | 'cash' | 'promo' | 'free'. (Stripe is redirected to `/checkout`).
- **promoCodeId** (UUID): ID of the validated discount token.
- **teamAssignment** (string): The name of the specific squad being joined.
- **guestIds** (array): List of profile IDs for a multi-ticket "Squad Join" transaction.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is required via `supabase.auth.getUser()`.
- **Bypass**: Uses `createAdminClient()` (Service Role) to perform atomic batch inserts for guests and to bypass RLS for real-time team capacity counting.
- **The Ban Enforcer**: Implements a strict gatekeeper that checks the `profiles` table for `is_banned` or `banned_until` timestamps before allowing any database writes.

## 🧪 Business Logic & Math

- **Squad Capacity Guard**: Performs a real-time, admin-level count of existing bookings for the specified `teamAssignment`. If the count exceeds the team's limit in `teams_config`, the request is rejected with a 400 error.
- **Waitlist Propagation**: Calculates `partySize` (User + Guests). If `current_players + partySize > max_players`, the entire transaction is automatically flagged with `status: 'waitlist'` and `payment_status: 'unpaid'`.
- **Wallet Deduction Engine**:
    - Mirroring the Stripe checkout logic, it calculates the `subtotalUnits` for the entire party.
    - It performs a `Math.min` comparison between the User's `credit_balance` and the `subtotalUnits`.
    - If credit is available, it performs an **update to the profiles table** to deduct the amount _before_ inserting the bookings.
- **Atomic Batch Insert**: Groups the primary user and all guests into a single `insertPayload` array, tagged with a matching `linked_booking_id` UUID to preserve the "Squad Purchase" relationship.

## 🔄 Returns / Side Effects

- **Returns**: `NextResponse.json({ success: true })` on success.
- **Email Trigger**: Calls `sendNotification` with the `confirmation` type, dispatching a transactional email containing game time, location, and payment totals.
- **Promo Tracker**: If a `promoCodeId` is provided, it increments the `current_uses` counter on the `promo_codes` table via the admin client.

---

**`/api/join` is the high-authority "Gatekeeper" of the platform, managing the transition from interested player to official participant while enforcing capacity limits and financial integrity.**