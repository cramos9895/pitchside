# 🧩 PublicBookingModal

**Type:** #component **Location:** `src/components/public/PublicBookingModal.tsx`

## 📥 Props Received

- **selectedSlot** (object): The `start`, `end`, and `resourceId` chosen by the user from the parent calendar.
- **isAuthenticated** (boolean): Used to conditionally render a login-wall instead of the booking form.
- **resources** (array): The list of available pits/courts used for final rate calculation.

## 🎛️ Local State & UI Logic

- **Tri-Path Conversion Funnel**:
    - **Stripe Checkout**: For standard paid rentals, it generates a secure session via `createCheckoutSession` and redirects the browser.
    - **Contract Request ($500+ Threshold)**: Implements "High-Value" logic where expensive bookings (e.g., full-day tournament rentals) bypass point-of-sale and enter a manual invoicing workflow.
    - **$0 Promo Logic**: Recognizes when a promo code covers 100% of the cost, triggering a "Free Booking" execution that bypasses payment gateways entirely.
- **Electronic Waiver Gate**:
    - Before proceeding to checkout, the component asynchronously verifies if the facility requires a liability waiver.
    - If a signature is missing, it interrupts the submission to present the `WaiverModal`, only resuming the booking once the legal record is inserted into `waiver_signatures`.
- **Real-Time Promo Engine**:
    - Validates codes against facility-specific rules, supporting both percentage-based and fixed-amount (cent-based) discounts.
- **Authentication Guard**:
    - Wraps the entire interaction in a login check, providing a clear call-to-action for anonymous users to create an account before securing their slot.

## 🔗 Used In (Parent Pages)

- `src/components/public/PublicFacilityCalendar.tsx`

## ⚡ Actions & API Triggers

- **[[submitBookingRequest]]**: Creates a `pending` booking record for approval-based resources.
- **[[createCheckoutSession]]**: Dispatches the user to Stripe for secure credit card processing.
- **[[validatePromoCode]]**: Server-side validation of marketing discounts.
- **[[executeFreePromoBooking]]**: A specialized action for handling $0 transactions without calling Stripe APIs.

---

**PublicBookingModal is the platform's primary revenue engine, orchestrating complex financial paths, legal compliance, and promo validation in a high-conversion interface.**