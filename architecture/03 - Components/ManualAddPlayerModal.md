# 🧩 ManualAddPlayerModal

**Type:** #component **Location:** `src/components/admin/ManualAddPlayerModal.tsx`

## 📥 Props Received

- **gameId** (string): The ID of the current Game/Event being managed.
- **basePrice** (number): The standard price of the game to fall back to when asserting a `payment_amount` (unless comped).
- **onSuccess** (() => void): Callback to refresh and force a re-render of the parent Game Management page upon a successful mutation.

## 🎛️ Local State & UI Logic

- An `open` boolean to dictate the appearance of the God Mode UI.
- A search input bound to a `searchQuery` state, triggering a direct client hook to interrogate the `profiles` table.
- A `selectedUser` state representing the target user identity to inject.
- A `paymentMethod` selector (`manual_fix`, `cash`, or `comp`) detailing the bypass reasoning.

## 🔗 Used In (Parent Pages)

- `src/app/admin/(dashboard)/games/[id]/page.tsx` (Admin Match Roster Control)

## ⚡ Actions & API Triggers

- **[[manualAddPlayerAction]]**: The critical Server Action running off `src/app/actions/manual-add-player.ts`.
    1. It asserts `supabaseAdmin` context (Service Role limits) to sidestep standard RLS parameters since admins are trying to insert foreign `user_id` records in the `bookings` table.
    2. Performs a check-then-update (UPSERT) pattern to verify if the player was previously cancelled. If so, they are reactivated to Active roster status without disrupting table constraints.
    3. Triggers success via toast, requiring no external Stripe calls or webhooks.

---

**ManualAddPlayerModal is the ultimate 'God Mode' bypass sequence ensuring administrators have full, uninterrupted control over putting humans onto rosters when standard checkout flows either fail or are bypassed maliciously physically.**
