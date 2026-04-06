# ⚙️ stripe-utils

**Type:** #infrastructure #financial #utility  
**Location:** `src/lib/stripe.ts`

## 📄 Expected Payload / Schema

- **refundPayment**: `paymentIntentId` (String), `amount` (Number | Optional in cents).

## 🛡️ Security & Permissions

- **Server-Side Lockdown**: This utility is the gatekeeper for the `STRIPE_SECRET_KEY`. It is strictly confined to the server-side environment, ensuring that high-authority payment operations (like creating refunds) can never be triggered directly from the client's browser.
- **Version Pinning**: The Stripe instance is locked to the **`2026-01-28.clover`** API version. This provides a stable "Logic Anchor" for the platform, preventing breaking changes in Stripe's response schemas from disrupting the PitchSide transactional flow.

## 🧪 Business Logic & Math

- **The "Financial Reversal" Engine**:
    - This is the platform's core **Escrow Correction** logic. It is utilized by `[[leave]]` and `[[cancel-player-registration]]` to handle participant withdrawals.
- **Polymorphic Refund Support**:
    - **Full Reversal**: If no `amount` is provided, the utility instructs Stripe to refund the entire original `PaymentIntent` balance.
    - **Partial Reversal**: Supports surgical refunds by passing a specific `amount`.
- **Cent-Precision Requirement**:
    - The utility enforces Stripe's integer-based **cent** model. It acts as the final "Sanitization Gate," ensuring that no floating-point decimals are sent to the payment processor, which would otherwise cause a `400 Bad Request` and stall the refund process.

## 🔄 Returns / Side Effects

- **Returns**: Standardized response `{ success: true, refund: object }` or `{ success: false, error: string }` with server-side logging for diagnostic auditing.
- **Side Effects**:
    - **Financial Reversal**: Triggers an actual movement of funds in the Stripe dashboard.
    - **Webhook Chain**: Successfully executing a refund eventually triggers the `charge.refunded` or `payment_intent.succeeded` webhooks, which are caught and reconciled by the `[[stripe]]` route to update the internal `bookings` table.

---

**`stripe-utils` is the platform's "Financial Plumber," providing the low-level, high-precision connectivity needed to synchronize PitchSide's internal roster logic with the global banking infrastructure.**