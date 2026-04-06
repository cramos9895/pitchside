# ⚙️ invite-actions

**Type:** #api #database #competition **Location:** `src/app/actions/invite-actions.ts`

## 📄 Expected Payload / Schema

- **acceptTeamInvite**:
    - `teamId`: (UUID) The target squad.
    - `tournamentId`: (UUID) The parent competition (Game or League).
    - `setupIntentId`: (String | Optional) Stripe SetupIntent for card vaulting.
    - `waiverAccepted`: (Boolean) Legal liability acknowledgment.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **The "One-Man-One-Competition" Lock**: Implements an atomic duplicate check. It queries `tournament_registrations` to ensure the user isn't already assigned to any other team (or as a free agent) within that specific `game_id` or `league_id`.
- **Liability Gate**: Explicitly blocks registration if `waiverAccepted` is false, ensuring 100% compliance before the database write.
- **Stripe Verification**: Instead of trusting the client, the action performs a server-side `stripe.setupIntents.retrieve` to confirm the payment method is valid and authorized before marking the player as `card_saved`.

## 🧪 Business Logic & Math

- **Polymorphic Target Discovery**:
    - Executes a **`gameCheck`** strategy to determine the competition type. If the `tournamentId` exists in the `games` table, it assigns the `game_id` foreign key; otherwise, it treats it as a `league_id`.
- **The "Deferred Payment" State**:
    - Unlike pickup games (which require immediate payment), team invites often use a "Vault-First, Charge-Later" model.
    - If a `setupIntentId` exists, the record is tagged with `payment_status: 'card_saved'`, enabling the `[[execute-shortfalls]]` engine to charge the player's vaulted card once the tournament roster is finalized.
- **Roster Role Assignment**:
    - Automatically defaults the role to `player`, as the `captain` role is reserved for the squad creator via `[[league-registration]]`.

## 🔄 Returns / Side Effects

- **Returns**: `{ success: true }` or throws a descriptive error.
- **UI Synchronization**: Triggers `revalidatePath` for:
    - `/dashboard`: Updating the player's upcoming games list.
    - `/tournaments/[id]/team/[id]`: Refreshing the squad roster list for other teammates and the captain.

---

**`invite-actions` is the platform's "Roster Link," mathematically converting private team invitations into legally compliant, financially vaulted roster positions.**