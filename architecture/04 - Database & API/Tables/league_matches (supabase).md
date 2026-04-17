# 🗄️ Table: league_matches

**Domain:** #database #competition  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique league match identifier. |
| **league_id** | `uuid` | - | `leagues.id` | The parent competition. |
| **home_team_id** | `uuid` | - | `teams.id` | Team A. |
| **away_team_id** | `uuid` | - | `teams.id` | Team B. |
| **home_score** | `int4` | - | - | Final tally. |
| **away_score** | `int4` | - | - | Final tally. |
| **week_number** | `int4` | `1` | - | Schedule period index. |
| **status** | `text` | `scheduled` | - | State: `scheduled`, `active`, `completed`. |
| **match_type** | `text` | `regular_season` | - | Type: `regular_season`, `playoff`. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[leagues (supabase).md]] | `league_id` | The league context. |
| **belongs_to** | [[teams (supabase).md]] | `home_team_id` | Home side. |
| **belongs_to** | [[teams (supabase).md]] | `away_team_id` | Away side. |

---

**The `league_matches` table handles the scheduling and results for structured league seasons.**