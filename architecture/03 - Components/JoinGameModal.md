# 🧩 JoinGameModal

**Type:** #component **Location:** `src/components/JoinGameModal.tsx`

## 📥 Props Received

- **isOpen / onClose**: Standard visibility controls.
- **onConfirm** (function): The primary "Transaction Bridge." Returns a payload containing `note`, `paymentMethod`, `promoCodeId`, `teamAssignment`, `guestIds`, and `isFreeAgent`.
- **gamePrice** (number): The raw base price of the event (in cents or primary unit).
- **isWaitlist** (boolean): Flag to bypass payment logic and standard squad selection.
- **isLeague** (boolean): Unlocks seasonal features like Captain vaulting and prize preferences.

## 🎛️ Local State & UI Logic

- **Transactional Step-Flow Architecture**:
    - The modal uses a two-step state machine (`details` ➔ `payment`).
    - **Details Phase**: Focuses on "Logistics" (Squad selection, Guest drafting, and Promo validation).
    - **Payment Phase**: Focuses on "Settlement" (Rendering dynamic payment instructions based on `allowed_payment_methods`).
- **The "Bring Friends" Engine**:
    - Implements a high-utility guest search bar using debounced `searchProfiles`.
    - Users can build a "Party" of guests, which dynamically updates the **Payment Summary Math** (Parties of $N$ $\times$ Target Price).
- **Compliance Intercept Pattern**:
    - The component acts as a high-security gatekeeper for the `WaiverModal`.
    - If a user attempts to finalize join/payment without a global signature on file, the modal intercepts the action, opens the waiver, and uses a `callback-resume` pattern to proceed with the original payment intent once the legal requirement is met.
- **Dynamic Pricing Engine**:
    - Implements complex price resolution logic: `(TargetPrice * PartySize) - PromoDiscount - WalletCredit`.
    - Supports **Captain Fee Overrides**: In leagues, if a captain has set a custom `invite_fee`, the modal automatically detects this and adjusts the price for that specific squad.
- **Squad Visualizer**:
    - Renders an interactive grid of teams based on `teams_config`.
    - Each team card provides a "Mini-Roster" view (showing full names of the first few players) and occupancy status ($N / Max$), helping players choose active squads over empty ones.
- **Deep-Link Payment Integration**:
    - For manual methods (Venmo/Zelle), it provides high-utility shortcuts: Venmo "Tap-to-Pay" deep links and Zelle "One-Tap Copy" buttons to reduce friction in non-automated transactions.

## 🔗 Used In (Parent Pages)

- `src/components/GameCard.tsx` (Primary entry point for Pickup and Tournaments)
- `src/components/public/LeagueCard.tsx` (Primary entry point for Seasons)

## ⚡ Actions & API Triggers

- **`validatePromoCode`**: Authenticates and applies discount tokens.
- **`getPaymentSettings`**: Pulls facility-level Venmo/Zelle handles.
- **`searchProfiles`**: Powers the teammate/guest recruitment search.
- **`onConfirm` Callback**: Handed off to the parent to trigger the actual `createBooking` or `StripeVault` sequence.

---

**JoinGameModal is the platform's primary conversion engine, distilling complex logistics, legal compliance, and multi-player checkout into a high-friction-to-safety, low-friction-to-payment user experience.**