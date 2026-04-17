# 🗄️ Table: league_resources

**Domain:** #database #facility  **Primary Key:** `league_id, resource_id`

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **league_id** | `uuid` | - | `leagues.id` | The competition. |
| **resource_id** | `uuid` | - | `resources.id` | The physical field reserved. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[leagues (supabase).md]] | `league_id` | The parent league. |
| **belongs_to** | [[resources (supabase).md]] | `resource_id` | The designated field. |

---

**The `league_resources` table maps specific facility fields to leagues, ensuring correct scheduling boundaries.**
