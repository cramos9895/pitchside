# ⚙️ stripe-callback

**Type:** #api #financial #onboarding  
**Location:** `src/app/api/stripe/callback/route.ts`

## 📄 Expected Payload / Schema

- **GET Params**: `facilityId` (UUID), `refresh` (boolean).
- **Action Context**: Automatically triggered by Stripe's redirect engine after a facility owner completes or exits the Express Connect onboarding flow.

## 🛡️ Security & Permissions

- **System Authority**: Uses `createAdminClient()` (Service Role) to update the `facilities` table. This is necessary because the redirect happens outside of a standard user-context session, and the platform must be able to update the record even if the user's browser session has timed out during the Stripe flow.
- **Server-to-Server Verification**: To prevent spoofing, the action does not trust the `facilityId` parameter alone. It uses the stored `stripe_account_id` to perform a live **`stripe.accounts.retrieve`** call, ensuring the account actually belongs to the facility being updated.

## 🧪 Business Logic & Math

- **The "Onboarding Truth" Sync**:
    - Resolves the discrepancy between "Finished the form" and "Actually cleared for payments."
    - It evaluates **`account.charges_enabled || account.details_submitted`**.
    - If true, it sets the local `facilities.charges_enabled` to `true`, essentially "Turning On" the facility's ability to appear in the global PitchSide marketplace and accept bookings.
- **Link Expiry Logic**:
    - Detects the `refresh=true` flag. If a user clicks a stale or expired onboarding link, Stripe redirects here with this flag. The endpoint catches this and redirects the user back to `/facility/settings/payments?error=link_expired` with a helpful UX message instead of a generic 404.
- **Dynamic Routing**:
    - Reconstructs the `baseUrl` from the request headers. This ensures that the callback works seamlessly across local development, staging, and production environments without hardcoded URLs.

## 🔄 Returns / Side Effects

- **Returns**: A terminal `NextResponse.redirect()` back to the facility's payment settings.
- **URL Feedback Loop**: Appends specific success/error tags (`?success=stripe_connected`, `?error=no_account_linked`) to the return URL, which are consumed by the frontend's toast notification system.
- **Database Side Effect**: Solidifies the `charges_enabled` status, which acts as a global filter for all game listings associated with that facility.

---

**`stripe-callback` is the platform's "Financial Reconciliation Gate," mathematically synchronizing the regulatory clearance of a physical facility with its operational status in the digital marketplace.**