# ⚙️ /api/checkout

**Type:** #api #database #financial **Location:** `src/app/api/checkout/route.ts`

## 📄 Expected Payload / Schema

- **gameId** (UUID): The target event.
- **userId** (UUID): The authenticated buyer.
- **partySize** (Derived): `1 + (guestIds.length)`.
- **isFreeAgent** (boolean): Flag for `setup_mode` (card vaulting only).
- **isLeagueCaptainVaulting** (boolean): Flag for deposit payment + card vaulting.
- **teamAssignment** (string): Selected squad name for capacity verification.
- **guestIds** (array): List of profile IDs for multi-ticket "Squad Checkouts".

## 🛡️ Security & Permissions

- **RLS Policy**: Server-side logic protected by authentication checks (implicitly via `userId`).
- **Bypass**: Uses `createAdminClient()` (Service Role) to perform multi-table verification across `games`, `bookings`, and `profiles` without RLS restrictions.
- **Stripe Customer Management**: Automatically retrieves or creates a `stripe_customer_id` for the user, ensuring financial records are consolidated.

## 🧪 Business Logic & Math

- **Double-Layer Capacity Enforcer**:
    1. **Global Check**: Verifies that `currentRosterSize + partySize <= max_players` across the entire event.
    2. **Squad Check**: If a `teamAssignment` is provided, it verifies `teamCount + partySize <= teamLimit` for that specific sub-group.
- **Wallet & Bypass Engine**:
    - Calculates `totalDueUnits = (Price * PartySize) - AppliedWalletCredit`.
    - **100% Wallet/Free Coverage**: If `totalDueUnits === 0`, the API executes a **Checkout Bypass**. It immediately deducts the credit from the profile and performs an **Atomic Multi-Insert** for the entire party into the `bookings` table.
- **Polymorphic Checkout Modes**:
    - **Free Agents**: Generates a `setup` mode session to vault a card on file without a charge.
    - **League Captains**: Generates a `payment` session with `setup_future_usage: 'off_session'`, capturing a deposit and securing the card for future seasonal installments.
    - **Standard Players**: Generates a standard `payment` session for immediate settlement.
- **Transactional Staging**: Before returning the client secret, the API inserts metadata into the **`pending_checkouts`** table. This ensures that guest IDs and wallet transaction data are preserved and accessible to the Stripe Webhook when the payment is confirmed.

## 🔄 Returns / Side Effects

- **Returns**:
    - `{ clientSecret: session.client_secret }`: For frontend Stripe Embedded Checkout rendering.
    - `{ bypassed: true }`: For immediate success redirection on free/wallet transactions.
- **Side Effects**: Staging of `pending_checkouts` record and potential immediate `profiles.credit_balance` deduction.

---

**`/api/checkout` is the financial gateway of the platform, orchestrating complex pricing math and polymorphic Stripe sessions to ensure secure, capacity-aware transactions.**