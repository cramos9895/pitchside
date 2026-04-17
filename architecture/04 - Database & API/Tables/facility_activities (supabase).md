# 🗄️ Table: facility_activities

**Domain:** #database #facility  **Primary Key:** `facility_id, activity_type_id`

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **facility_id** | `uuid` | - | `facilities.id` | The venue. |
| **activity_type_id** | `uuid` | - | `activity_types.id` | The sport offered. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |

---

**The `facility_activities` junction table maps venues to the sports they support.**