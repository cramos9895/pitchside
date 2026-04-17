# 🗄️ Table: resource_bookings

**Domain:** #database #facility  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique booking record identifier. |
| **facility_id** | `uuid` | - | `facilities.id` | The venue hosting the rental. |
| **resource_id** | `uuid` | - | `resources.id` | The specific field/court. |
| **user_id** | `uuid` | - | `profiles.id` | The renter/owner. |
| **title** | `text` | - | - | Private label for the reservation. |
| **start_time** | `timestamp` | - | - | Start of rental period. |
| **end_time** | `timestamp` | - | - | End of rental period. |
| **status** | `text` | `confirmed` | - | State: `confirmed`, `pending`, `cancelled`. |
| **is_listed** | `boolean` | `false` | - | Marketplace visibility flag. |
| **listing_price** | `numeric` | - | - | Price if listed on the marketplace. |
| **marketplace_status** | `text` | `none` | - | State: `none`, `listed`, `sold`. |
| **recurring_group_id** | `uuid` | - | `recurring_booking_groups.id` | Link for repeated series. |
| **stripe_payment_intent_id** | `text` | - | - | Secure payment reference. |

---

**The `resource_bookings` table manages the scheduling and marketplace lifecycle of facility rentals.**
<!-- slide -->
# 🗄️ Table: system_settings

**Domain:** #database #cms  **Primary Key:** `key` (Text)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **key** | `text` | - | - | Unique configuration key (e.g. `maintenance_mode`). |
| **value** | `jsonb` | `true` | - | The value stored in JSON format. |
| **label** | `text` | - | - | Human-readable name (Admin UI). |
| **category** | `text` | `general` | - | Grouping: `general`, `auth`, `experimental`. |
| **description** | `text` | - | - | Support text for administrators. |

---

**The `system_settings` table stores persistent application-wide configurations and feature flags.**
<!-- slide -->
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
<!-- slide -->
# 🗄️ Table: tournament_registrations

**Domain:** #database #competition  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique signup identifier. |
| **game_id** | `uuid` | - | `games.id` | The parent tournament event. |
| **league_id** | `uuid` | - | `leagues.id` | The parent competition context. |
| **user_id** | `uuid` | - | `profiles.id` | The individual player signing up. |
| **team_id** | `uuid` | - | `teams.id` | Optional: The team being registered. |
| **status** | `text` | `registered` | - | State: `registered`, `drafted`, `waitlisted`, `cancelled`. |
| **payment_status** | `text` | `pending` | - | Transactional state. |
| **stripe_setup_intent_id** | `text` | - | - | Reference for card collection/autocharge. |

---

**The `tournament_registrations` table handles the enrollment flow for competitive events, supporting both individual free agents and full teams.**