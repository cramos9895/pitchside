# 🗄️ Table: match_players

**Domain:** #database #competition  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique record identifier. |
| **match_id** | `uuid` | - | [[matches (supabase).md]] | The specific match. |
| **user_id** | `uuid` | - | [[profiles (supabase).md]] | The player participant. |
| **is_checked_in** | `boolean` | `false` | - | Attendance flag. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[matches (supabase).md]] | `match_id` | The match context. |
| **belongs_to** | [[profiles (supabase).md]] | `user_id` | The player profile. |

---

**The `match_players` table tracks roster presence for individual matches, particularly in tournament settings.**