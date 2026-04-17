# 🗄️ Table: activity_types

**Domain:** #database #facility  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique sport identifier. |
| **name** | `text` | - | - | Public sport name (e.g. `Soccer`). |
| **color_code** | `text` | `#00FF00` | - | hex color for UI branding. |
| **is_active** | `boolean` | `true` | - | Global toggle for sport availability. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |

---

**The `activity_types` table defines the library of sports supported by the platform.**
<!-- slide -->
# 🗄️ Table: facility_activities

**Domain:** #database #facility  **Primary Key:** `facility_id, activity_type_id`

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **facility_id** | `uuid` | - | `facilities.id` | The venue. |
| **activity_type_id** | `uuid` | - | `activity_types.id` | The sport offered. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |

---

**The `facility_activities` junction table mapsvenues to the sports they support.**
<!-- slide -->
# 🗄️ Table: resource_activities

**Domain:** #database #facility  **Primary Key:** `resource_id, activity_type_id`

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **resource_id** | `uuid` | - | `resources.id` | The specific court/field. |
| **activity_type_id** | `uuid` | - | `activity_types.id` | The sport compatible with this field. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |

---

**The `resource_activities` table defines which sports can be played on which specific primary resources.**
<!-- slide -->
# 🗄️ Table: resource_types

**Domain:** #database #facility  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Type identifier. |
| **name** | `text` | - | - | e.g. `Indoor Turf`, `Hardcourt`. |
| **default_hourly_rate** | `numeric` | `100.00` | - | Suggested base price forvenues. |
| **is_active** | `boolean` | `true` | - | Availability toggle. |

---

**The `resource_types` table categorizes physical assets (e.g., Hardcourt, Outdoor Turf) across the platform.**