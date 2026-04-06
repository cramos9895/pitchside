# 🗄️ Table: pending_checkouts

**Domain:** #database #financial #state **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column                  | Type        | Description                                                                                                       |
| ----------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| **id**                  | `uuid`      | Primary unique identifier for the specific checkout intent.                                                       |
| **buyer_id**            | `uuid`      | (FK) Reference to the profiles record of the individual initiating the payment.                                   |
| **game_id**             | `uuid`      | (FK) Reference to the games record being purchased.                                                               |
| **guest_ids**           | `uuid[]`    | An array of player IDs reserved in this session (critical for group/guest bookings).                              |
| **team_assignment**     | `text`      | The roster spot or squad name reserved during the checkout phase.                                                 |
| **credit_used**         | `integer`   | The amount of internal `credit_balance` (in cents) deducted from the user's wallet before charging Stripe.        |
| **checkout_session_id** | `text`      | **(Unique Index)** The Stripe Session ID used to reconcile a successful payment with the original browser intent. |
| **created_at**          | `timestamp` | Time-stamp of the initial registration attempt.                                                                   |

## 🔗 Relationships

- **belongs_to** profiles (`buyer_id`) - Identifies the financial responsible party.
- **belongs_to** games (`game_id`) - Identifies the inventory being reserved.
- **State Consumer**: The `[[stripe]]` webhook and `[[checkout]]` action.

## 🛡️ RLS & Governance

- **Select**: Strictly restricted. Users can only view their own checkout intents (`auth.uid() = buyer_id`).
- **Insert**: Users can only create intents for themselves.
- **The "Metadata Safety Net"**: This table is the platform's **Atomic State Guard**. Because Stripe metadata is limited to 500 characters, complex group bookings (multiple guest IDs + team preferences) are "staged" here during the `[[checkout]]` action. When the global `[[stripe]]` webhook receives a success notification, it uses the `checkout_session_id` to query this table, retrieving the full participant context and ensuring no data is lost during the 3rd-party handoff.

---

**The `pending_checkouts` table is the platform's "Transactional Staging Ground," mathematically ensuring that complex registration data survives the transition between the local PitchSide state and the external Stripe payment ecosystem.**