# 🗄️ Table: resources

**Domain:** #database #facility  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique physical resource identifier. |
| **facility_id** | `uuid` | - | `facilities.id` | The parent venue. |
| **resource_type_id** | `uuid` | - | `resource_types.id` | Classification (e.g. `Indoor`, `Turf`). |
| **name** | `text` | - | - | Public name (e.g. `Court 1`). |
| **default_hourly_rate** | `int4` | `0` | - | Base price for rental. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[facilities (supabase).md]] | `facility_id` | The owning venue. |
| **belongs_to** | [[resource_types (supabase).md]] | `resource_type_id` | The type classification. |
| **has_many** | [[resource_bookings (supabase).md]] | `resource_id` | Individual rentals. |
| **has_many** | [[games (supabase).md]] | `resource_id` | Scheduled matches. |

---

**The `resources` table represents the physical courts, fields, or spaces available for booking within a facility.**