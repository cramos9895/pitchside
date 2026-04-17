# 🗄️ Table: leagues

**Domain:** #database #competition  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique league identifier. |
| **facility_id** | `uuid` | - | `facilities.id` | The hosting venue. |
| **activity_id** | `uuid` | - | `activity_types.id` | The sport type. |
| **name** | `text` | - | - | Public league name. |
| **sport** | `text` | - | - | e.g. `Soccer`, `Basketball`. |
| **status** | `text` | `draft` | - | State: `draft`, `registration`, `active`, `completed`. |
| **season** | `text` | - | - | e.g. `Spring 2026`. |
| **start_date** | `date` | - | - | Kickoff date of the league. |
| **end_date** | `date` | - | - | Final match date. |
| **price_per_team** | `numeric` | - | - | Roster registration fee. |
| **league_format** | `text` | `structured` | - | Mode: `structured`, `rolling`. |
| **max_teams** | `int4` | - | - | Participant cap. |
| **registration_open** | `boolean` | `false` | - | Enrollment status flag. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[facilities (supabase).md]] | `facility_id` | The hosting venue. |
| **has_many** | [[teams (supabase).md]] | `league_id` | Participating squads. |
| **has_many** | [[league_matches (supabase).md]] | `league_id` | Scheduled match sessions. |
| **has_many** | [[tournament_registrations (supabase).md]] | `league_id` | Individual and team signups. |

---

**The `leagues` table defines long-term competitive series hosted by facilities.**