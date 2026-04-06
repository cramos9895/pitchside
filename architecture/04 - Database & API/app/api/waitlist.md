# ⚙️ /api/waitlist

**Type:** #api #database **Location:** `src/app/api/waitlist/route.ts`

## 📄 Expected Payload / Schema

- **gameId** (UUID): The target event to join the queue for.
- **note** (string): Optional teammate requests or skill level notes.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is required via `supabase.auth.getUser()`.
- **The Ban Enforcer**: Strictly implements the platform-standard suspended user check. It verifies both `is_banned` (permanent) and `banned_until` (temporary) before allowing the user to occupy a queue position.
- **Identity Lock**: Enforces a "One-Roster-Spot" rule. It queries the `bookings` table to ensure the user doesn't already have an active (`paid`, `pending`, or `waitlist`) entry, preventing users from spamming the queue.

## 🧪 Business Logic & Math

- **Zero-Financial Commitment**:
    - Unlike the standard join route, this API bypasses Stripe entirely.
    - It sets `payment_status: 'unpaid'`, `payment_amount: 0`, and `payment_method: 'free'`, as waitlist spots are not charged until a seat is vacated.
- **Transactional State Management**:
    - It specifically targets the **`waitlist`** status in the `bookings` table.
    - Logic: It ignores any records marked as `cancelled`, allowing users who previously left a game to re-enter the queue without a "duplicate" error.
- **"Draft-Pool" Compatibility**:
    - The record is inserted with `checked_in: false`, ensuring it remains invisible to the active roster display until an administrator or the automated `[[leave]]` logic promotes them to a confirmed spot.

## 🔄 Returns / Side Effects

- **Returns**: Standardized `NextResponse.json({ success: true })` on successful insertion.
- **Side Effects**: None from the API itself. Notifications and automated promotions are downstream effects triggered by the `[[leave]]` and `[[kick]]` routes when a confirm spot becomes available.

---

**`/api/waitlist` is the platform's "Pressure Valve," allowing participants to join the event ecosystem at zero cost while providing organizers with a "Drought Roster" for filling last-minute vacancies.**