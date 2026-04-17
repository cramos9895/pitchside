# 🗄️ Table: promo_codes

**Domain:** #database #finance  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique code identifier. |
| **facility_id** | `uuid` | - | `facilities.id` | Optional: restrict code to one venue. |
| **code** | `text` | - | - | The unique string entered by users (e.g. `KICKOFF10`). |
| **discount_type** | `text` | - | - | Type: `percentage`, `fixed_amount`. |
| **discount_value** | `int4` | - | - | Magnitude of the discount. |
| **max_uses** | `int4` | - | - | Total redemption cap. |
| **current_uses** | `int4` | `0` | - | Redemption counter. |
| **expires_at** | `timestamp` | - | - | Temporal validity limit. |

---

**The `promo_codes` table manages marketing discounts and redemption logic for game bookings.**