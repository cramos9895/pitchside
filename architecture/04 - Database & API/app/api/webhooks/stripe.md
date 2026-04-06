# ⚙️ /api/webhooks/stripe

**Type:** #api #financial #database **Location:** `src/app/api/webhooks/stripe/route.ts`

## 📄 Expected Payload / Schema

- **Event Type**: `checkout.session.completed` (Primary).
- **Metadata**: Expects `booking_id` and optional `promo_code_id` within the Stripe session object.
- **Signature**: Requires a valid `stripe-signature` header for verification.

## 🛡️ Security & Permissions

- **RLS Policy**: Bypasses all standard RLS via `createAdminClient()` (Service Role), as webhooks are server-to-server communications from Stripe.
- **Signature Verification**: Implements `stripe.webhooks.constructEvent` to ensure the payload originated from Stripe.
- **Bypass Enforcement**: If the `STRIPE_WEBHOOK_SECRET` environment variable is missing, the route defaults to a JSON parse (Dev Mode), but strictly enforces verification in production to prevent malicious state manipulation.

## 🧪 Business Logic & Math

- **The "Truth Bridge"**: This route is the only authority allowed to transition a `pending` booking into a `confirmed` and `paid` state based on external financial settlement.
- **Atomic Promotion Tracking**:
    - Upon a successful checkout, it retrieves the current `current_uses` of the associated promo code.
    - It increments the usage in the database, ensuring that limited-use coupons are accurately tracked even if the user closes the browser before redirection.
- **Dynamic Receipt Assembly**:
    - Orchestrates a multi-table lookup (`resource_bookings` ➔ `profiles` ➔ `resources`) to gather the necessary data (user name, facility field name, time/date) for a high-quality receipt.
    - Converts the raw Stripe `amount_total` (cents) into a human-readable currency string for the user's records.

## 🔄 Returns / Side Effects

- **Returns**: `NextResponse('OK', { status: 200 })` to inform Stripe the event was successfully ingested.
- **Side Effects**:
    - Transitions database booking status from `pending` ➔ `confirmed`.
    - Dispatches a `booking_receipt` email trigger to the customer.
    - Updates operational counters in the `promo_codes` table.

---

**`/api/webhooks/stripe` is the mission-critical listener that solidifies the platform's state-of-truth, ensuring that financial settlement and database state remain perfectly synchronized.**