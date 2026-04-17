# 🗄️ Table: recurring_booking_groups

**Domain:** #database #facility  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | - | - | Group identifier for linked bookings. |
| **facility_id** | `uuid` | - | `facilities.id` | The venue providing the rentals. |
| **user_id** | `uuid` | - | `profiles.id` | The owner/renter. |
| **payment_term** | `text` | - | - | Billing cycle: `upfront`, `weekly`. |
| **final_price** | `int4` | `0` | - | Total derived price for the series. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[facilities (supabase).md]] | `facility_id` | The providing venue. |
| **belongs_to** | [[profiles (supabase).md]] | `user_id` | The responsible renter. |
| **has_many** | [[resource_bookings (supabase).md]] | `recurring_group_id` | Individual booking instances. |

---

**The `recurring_booking_groups` table allows multiple facility rentals (e.g., Every Monday at 8pm) to be managed as a single financial entity.**
