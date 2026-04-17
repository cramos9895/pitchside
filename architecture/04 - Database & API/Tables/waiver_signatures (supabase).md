# 🗄️ Table: waiver_signatures

**Domain:** #database #legal  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique signature identifier. |
| **user_id** | `uuid` | - | `profiles.id` | The signer. |
| **facility_id** | `uuid` | - | `facilities.id` | The venue for which the waiver applies. |
| **agreed_at** | `timestamp` | `now()` | - | Legal timestamp of acceptance. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[profiles (supabase).md]] | `user_id` | The player signing. |
| **belongs_to** | [[facilities (supabase).md]] | `facility_id` | The venue being protected. |

---

**The `waiver_signatures` table stores the digital paper trail of legal agreements, required for facility check-in.**
