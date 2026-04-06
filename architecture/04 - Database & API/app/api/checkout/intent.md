# ⚙️ /api/checkout/intent

**Type:** #api #financial **Location:** `src/app/api/checkout/intent/route.ts`

## 📄 Expected Payload / Schema

- **gameId** (UUID): The target event.
- **userId** (UUID): The authenticated buyer.
- **price** (number): The raw transaction amount (e.g., 10.00).
- **isLeagueCaptainVaulting** (boolean): Flag for off-session card security.
- **teamAssignment** (string): Selected squad for metadata tracking.

## 🛡️ Security & Permissions

- **RLS Policy**: Server-side logic using `createAdminClient()` (Service Role) to retrieve user profile data and map Stripe Customer IDs.
- **PCI Compliance**: Returns only a `client_secret`, ensuring that no sensitive card data touches the PitchSide servers.

## 🧪 Business Logic & Math

- **Precision Conversion**: Converts the decimal `price` into `amountInCents` (integer) for Stripe compatibility.
- **Meta-Data Persistence**: Attaches the full event context (`game_id`, `user_id`, `promo_code_id`, `team_assignment`) directly to the Stripe PaymentIntent. This ensures that the Stripe Dashboard provides an audit trail linked directly to the application's database.
- **Off-Session Authorization**: If the user is a league captain, it sets `setup_future_usage: 'off_session'`. This authorizes the platform to charge the vaulting card for subsequent league installments without the user needing to return to the site.
- **Expanded Payment Types**: Specifically enables `cashapp` and `card` at the intent level, providing localized payment flexibility beyond standard credit cards.

## 🔄 Returns / Side Effects

- **Returns**: `NextResponse.json({ clientSecret: paymentIntent.client_secret })` for use with the Stripe `Elements` provider.
- **Side Effects**: Creation of a persistent `PaymentIntent` in the Stripe dashboard, even if the user does not complete the checkout immediately.

---

**`/api/checkout/intent` provides granular control for custom payment interfaces, serving as the bridge for specialized vaulting and off-session league billing.**