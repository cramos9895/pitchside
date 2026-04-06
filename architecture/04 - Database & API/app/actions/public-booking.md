# ⚙️ public-booking

**Type:** #api #database #infrastructure **Location:** `src/app/actions/public-booking.ts`

## 📄 Expected Payload / Schema

- **submitBookingRequest**:
    - `facilityId` & `resourceId`: (UUID) The target venue and specific pitch.
    - `title`: (String) The custom name for the booking request.
    - `contactEmail`: (String) Renter's contact point.
    - `startTime` & `endTime`: (ISO String) The requested window.
    - `isContractRequest`: (Boolean | Optional) Flags the request for long-term lease review.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Administrative Bypass**: Utilizes `createAdminClient()` specifically for **Collision Auditing**. By bypassing RLS, the engine can accurately check the _entire_ physical calendar (including private bookings the user shouldn't see) to prevent inadvertent double-bookings.
- **Staff Routing Logic**: Automatically identifies and pulls the `profiles` for all users with the `facility_admin` role assigned to that specific `facility_id`. This ensures that booking requests are routed only to the relevant personnel.

## 🧪 Business Logic & Math

- **The "Physical Intersection" Engine**:
    - Executing a `resource_bookings` boundary check: `ProposedStart < ExistingEnd AND ProposedEnd > ExistingStart`. This logic is critical for the "Request-then-Pay" flow, ensuring a slot isn't snagged by a regular pickup game while a request is pending.
- **Free-Tier Redemption Logic** (`executeFreePromoBooking`):
    - Implements a **Zero-Stripe Transaction Path**.
    - **Server-Side Promo Audit**: Instead of trusting the client's discounted price, the action re-fetches the `promo_code` from the database, re-validates `expires_at` and `max_uses`, and atomically updates the usage counter.
    - **Status Promotion**: If the promo covers 100% of the cost, the booking status is immediately set to `confirmed` and `payment_status: 'free'`, bypassing the standard manual review queue.
- **Notification Pipeline**:
    - Triggers twin notifications: An in-app `booking_request` alert for the host and a `NewRequestEmail` for the facility's administrative staff.

## 🔄 Returns / Side Effects

- **Returns**: `{ success: true }` on a valid submission.
- **Side Effects**:
    - **Email Engine**: Dispatches `BookingConfirmedEmail` as a receipt if the transaction is automatically processed via a promo code.
    - **Database State**: Inserts new records into `resource_bookings` with context-aware color coding (`#EAB308` for contracts, `#3B82F6` for standard reviews).

---

**`public-booking` is the platform's "Leasing Bridge," providing the safety logic and notification infrastructure needed to transition physical space from a public marketplace into a private, confirmed contract.**