# 🗄️ Table: resource_types

**Domain:** #database #facility  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Type identifier. |
| **name** | `text` | - | - | e.g. `Indoor Turf`, `Hardcourt`. |
| **default_hourly_rate** | `numeric` | `100.00` | - | Suggested base price for venues. |
| **is_active** | `boolean` | `true` | - | Availability toggle. |

---

**The `resource_types` table categorizes physical assets (e.g., Hardcourt, Outdoor Turf) across the platform.**