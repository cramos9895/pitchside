# ⚙️ processLeaguePayments

**Type:** #api #financial #database **Location:** `src/app/actions/process-league-payments.ts`

## 📄 Expected Payload / Schema

- **leagueId** (UUID): The target league session for bulk billing.
- **Filtering**: Automatically targets rows in `tournament_registrations` where `payment_status === 'card_saved'`.

## 🛡️ Security & Permissions

- **RLS Policy**: Server-side "Server Action" and protected by administrative role requirements (implied by dashboard access).
- **Bypass**: Uses `createAdminClient()` (Service Role) to execute high-authority financial updates across multiple registration records.
- **Off-Session Authorization**: Specifically utilizes the `off_session: true` Stripe flag, which relies on the cryptographic "SetupIntent" captured during initial registration to authorize non-interactive charging.

## 🧪 Business Logic & Math

- **Bulk Billing Loop**:
    - Implements a resilient iteration logic. Each registration is processed as an isolated sub-transaction.
    - **Resilience Policy**: A failure in one payment (e.g., "Card Declined") is caught and logged to the specific row (`payment_status: 'failed'`), allowing the loop to continue to the next record without a total process crash.
- **Stripe SetupIntent Retrieval**:
    - Before charging, it retrieves the `SetupIntent` to extract the `customer_id` and `payment_method_id` secured during the "Vaulting" phase of registration.
- **Team-Price Distribution**:
    - Dynamically calculates the `totalAmountCents`. It prioritizes `reg.amount_due_cents` (individual pro-rated fees) and falls back to `league.team_price` (wholesale squad fees).
- **Audit Logging**:
    - Attaches both `registration_id` and `league_id` to the Stripe metadata, ensuring that every automatic charge can be traced back to the specific team in the Stripe dashboard and PitchSide logs.

## 🔄 Returns / Side Effects

- **Returns**: A complex summary object containing:
    - `results`: Detailed success/fail status for every registration processed.
    - `summary`: High-level counters (`total`, `success`, `failed`) for the admin dashboard.
- **Side Effects**:
    - Performs a `revalidatePath()` on `/admin/leagues/[id]`, forcing the Host Portal to show updated "Paid" vs "Failed" statuses immediately after execution.

---

**`processLeaguePayments` is the platform's "Collection Engine," transforming vaulted cards into realized revenue through automated, resilient off-session transactions.**