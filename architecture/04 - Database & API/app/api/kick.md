# ⚙️ /api/kick

**Type:** #api #database #administration **Location:** `src/app/api/kick/route.ts`

## 📄 Expected Payload / Schema

- **gameId** (UUID): The target event ID.
- **targetUserId** (UUID): The profile ID of the player being forcefully removed.
- **Action Context**: Triggered from the Host Portal's roster management view ("Kick Player").

## 🛡️ Security & Permissions

- **RLS Policy**: Protected by server-side role verification.
- **Administrative Restriction**: Strictly enforces that the caller has a profile role of `admin` or `master_admin`. Any other role receives a 403 Forbidden response.
- **Bypass**: Utilizes `createAdminClient()` (Service Role) to perform administrative overrides on the `bookings` table, as standard players are prohibited from cancelling other users' reservations via RLS.

## 🧪 Business Logic & Math

- **Roster Sanitization**:
    - Sets the target booking's status to `cancelled`, `roster_status` to `dropped`, and `payment_status` to `refunded`. This ensures the player is immediately removed from the `FieldProjector` and `StandingsTable` calculations.
- **Waitlist "Vacuum" Logic**:
    - **Capacity Check**: Immediately following the kick, the API performs a real-time count of all non-cancelled, non-waitlisted bookings.
    - **Automated Promotion**: If `currentPlayers < max_players`, the system identifies the oldest waitlist entry (`order BY created_at ASC`).
    - **State Transition**: The waitlisted player is atomically updated to `roster_status: 'confirmed'` and `status: 'paid'`, effectively filling the hole created by the kicked player.
- **Legacy Sync**: Maintains compatibility with the older `status` field by syncing `status: 'paid'` alongside the newer `roster_status: 'confirmed'`.

## 🔄 Returns / Side Effects

- **Returns**: `NextResponse.json({ success: true })` on success.
- **Waitlist Notification Trigger**:
    - If a player was promoted, the system dispatches a `waitlist_promotion` email containing the game time, location, and a "Claim Spot" URL.

---

**`/api/kick` is the platform's "Enforcement Tool," allowing administrators to manage facility capacity while maintaining high-frame-rate roster accuracy and automated waitlist transitions.**