# ⚙️ /api/stripe/connect

**Type:** #api #financial #onboarding **Location:** `src/app/api/stripe/connect/route.ts`

## 📄 Expected Payload / Schema

- **facilityId** (UUID, optional): For Super Admins looking to trigger onboarding for a specific venue.
- **Action Context**: Triggered from the Facility Settings dashboard when a host clicks "Set Up Payouts."

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Identity Lock**: Strictly verifies that the user holds a `facility_admin` or `master_admin` role. Standard users or unassigned hosts are blocked.
- **Role Verification**: If not a Super Admin, the API enforces that the user's `profile.facility_id` must match the target facility being onboarded.
- **Bypass**: Employs `createAdminClient()` (Service Role) to write the `stripe_account_id` to the `facilities` table, ensuring the record is saved even if the host's standard account has limited schema permissions.

## 🧪 Business Logic & Math

- **The "Express Onboarding" Engine**:
    - **Lazy Account Creation**: If the facility does not already have a linked Stripe ID, the API invokes **`stripe.accounts.create`** with `type: 'express'`.
    - **Capabilities Request**: Explicitly requests `card_payments` (to accept participant fees) and `transfers` (to receive facility payouts).
- **Secure Redirection Mapping**:
    - Dynamically constructs a `baseUrl` from the request headers to support multi-tenant domains (e.g., local dev vs. production).
    - Generates an **`account_onboarding`** link.
    - **State Continuity**: Configures a `return_url` and `refresh_url` that pass the `facilityId` back to the platform's callback handler (`/api/stripe/callback`), ensuring the onboarding flow can resume seamlessly if interrupted.

## 🔄 Returns / Side Effects

- **Returns**: `NextResponse.json({ url: string })`, providing the secure link to the Stripe-hosted onboarding experience.
- **Side Effects**:
    - Creation of a new, managed Express account in the facility's Stripe dashboard.
    - Permanent update to the `facilities.stripe_account_id` column in the database.

---

**`/api/stripe/connect` is the platform's "Financial Bridge," mathematically linking local sports facilities to the global banking infrastructure via the Stripe Connect ecosystem.**