# 🗄️ Table: pending_checkouts

**Domain:** #database #finance  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique checkout instance key. |
| **buyer_id** | `uuid` | - | `profiles.id` | The user initiating payment. |
| **game_id** | `uuid` | - | `games.id` | The match being purchased. |
| **guest_ids** | `_uuid` | `[]` | - | Linked profiles for multi-buy registrations. |
| **checkout_session_id** | `text` | - | - | Stripe Checkout Session reference. |
| **credit_used** | `int4` | `0` | - | Amount of internal wallet balance applied. |
| **created_at** | `timestamp` | `now()` | - | Expiration audit (TTL handled via cleanup job). |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[profiles (supabase).md]] | `buyer_id` | The customer. |
| **belongs_to** | [[games (supabase).md]] | `game_id` | The target match. |

## 🛡️ RLS & Governance

- **Security**: Acts as a "Dead Drop" for Stripe Webhooks to verify intent before finalizing `bookings`.

---

**The `pending_checkouts` table stores temporary transactional state during the Stripe Checkout flow.**