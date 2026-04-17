# 🗄️ Table: notifications

**Domain:** #database #social  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique notification identifier. |
| **user_id** | `uuid` | - | `auth.users.id` | Target recipient. |
| **message** | `text` | - | - | Notification body. |
| **type** | `text` | `info` | - | Type: `info`, `alert`, `success`. |
| **is_read** | `boolean` | `false` | - | Read status flag. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |

## 🛡️ RLS & Governance

- **Select**: Restricted to the owner (`user_id = auth.uid()`).
- **Update**: Restricted to the owner for marking as read.
- **Insert**: System-only (via edge functions or server actions).

---

**The `notifications` table handles in-app alerts for match invites, payment confirmations, and system announcements.**
<!-- slide -->
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
<!-- slide -->
# 🗄️ Table: platform_settings

**Domain:** #database #cms  **Primary Key:** `id` (Int)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `int4` | - | - | Singleton identifier (must be 1). |
| **fee_type** | `text` | `percent` | - | Calculation: `percent`, `fixed`, `both`. |
| **fee_percent** | `numeric` | `5.0` | - | Percentage-based service fee. |
| **fee_fixed** | `int4` | `100` | - | Fixed dollar surcharge (in cents). |
| **updated_at** | `timestamp` | `now()` | - | Last modification audit. |

## 🛡️ RLS & Governance

- **Select**: Publicly readable (unauthenticated).
- **Update**: Restricted to `master_admin` roles.

---

**The `platform_settings` table stores global financial constants and operational toggles.**