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