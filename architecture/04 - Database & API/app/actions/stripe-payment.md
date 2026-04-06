# ⚙️ stripe-payment

**Type:** #api #financial **Location:** `src/app/actions/stripe-payment.ts`

## 📄 Expected Payload / Schema

- **createDepositPaymentIntent**: `amountInCents` (Integer).
- **createSetupIntent**: No parameters (Initializes a blank intent for card capture).

## 🛡️ Security & Permissions

- **RLS Policy**: Protected by administrative context and authenticated user sessions.
- **PCI Compliance**: Returns only a `clientSecret`, ensuring no sensitive card data is ever handled by the PitchSide server.

## 🧪 Business Logic & Math

- **The "Vaulting" Engine**:
    - `createSetupIntent` specifically enables **`usage: 'off_session'`**. This is the platform's foundational security flag that allows future league installments and "Escrow Shortfalls" to be charged without the user's presence.
- **Micro-Payment Support**:
    - `createDepositPaymentIntent` enables both **`card`** and **`cashapp`** as native payment methods, providing a frictionless checkout experience for mobile users.
- **Atomicity**:
    - These actions are stateless wrappers around the Stripe SDK, designed to be called during UI initialization (e.g., when a modal opens) to prepare the client-side Payment Elements.

## 🔄 Returns / Side Effects

- **Returns**: `{ clientSecret: string, id: string }`.
- **Side Effects**: Creation of a persistent Intent record in the Stripe Dashboard for auditing and tracking.

---

**`stripe-payment` provides the low-level financial primitives required to secure payment methods and collect deposits across the platform.**