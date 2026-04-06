# 🧩 StripeCheckoutModal

**Type:** #component **Location:** `src/components/public/StripeCheckoutModal.tsx`

## 📥 Props Received

- **amount** (number): The total dollar amount to be charged.
- **onSuccess** (function): A callback executed after successful payment confirmation to trigger parent UI updates (e.g., closing the modal, refreshing the roster).
- **title / description** (string): Marketing copy displayed in the modal header to reassure the user what they are paying for.

## 🎛️ Local State & UI Logic

- **Server-Side Intent Synchronization**:
    - Upon opening, the component automatically POSTs to `/api/checkout/intent` with the current `gameId` and `userId`. This ensures the transaction is recorded in the backend and linked to the correct event before the user even enters their card details.
- **PitchSide Themed "Elements"**:
    - Wraps the Stripe SDK in a custom `night` theme, overriding default colors with `pitch-accent` (`#cbff00`) and `pitch-black` backgrounds for a seamless, white-label payment experience.
- **Express Checkout Strategy**:
    - Configures the `PaymentElement` with `wallets: 'auto'`, enabling **Apple Pay** and **Google Pay** automatically for mobile users to reduce friction.
- **SPA-Optimized Redirect Logic**:
    - Uses `redirect: 'if_required'` in the `confirmPayment` call. This allows the component to capture a successful result and execute the `onSuccess()` callback without a full browser refresh, maintaining the application's single-page state.
- **Real-Time Security Feedback**:
    - Displays a "Secure Lock" icon and "Payments secured by Stripe" footer to build trust during the high-intent final step of the registration funnel.

## 🔗 Used In (Parent Pages)

- `src/app/tournaments/[id]/register/page.tsx`
- `src/app/leagues/[id]/register/page.tsx`
- `src/components/public/CaptainDashboard.tsx` (For settling balances)

## ⚡ Actions & API Triggers

- **`/api/checkout/intent`**: The primary backend endpoint for generating `clientSecret` and logging the payment attempt.
- **`stripe.confirmPayment`**: The frontend bridge to Stripe’s secure infrastructure.
- **`onSuccess()`**: Triggers the parent's completion logic, which typically involves a `router.refresh()` to update roster statuses.

---

**StripeCheckoutModal is the platform's primary financial gateway, providing a secure, themed, and mobile-optimized checkout experience for all consumer transactions.**