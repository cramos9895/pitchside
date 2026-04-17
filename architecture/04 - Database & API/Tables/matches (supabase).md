# 🗄️ Table: matches

**Domain:** #database #competition  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique match instance identifier. |
| **game_id** | `uuid` | - | `games.id` | The parent tournament/event. |
| **home_team** | `text` | - | - | Team A display name (string). |
| **away_team** | `text` | - | - | Team B display name (string). |
| **home_team_id** | `uuid` | - | `teams.id` | Relational FK for Home team (Rolling League). |
| **away_team_id** | `uuid` | - | `teams.id` | Relational FK for Away team (Rolling League). |
| **home_score** | `int4` | `0` | - | Goals/Points for Home side. |
| **away_score** | `int4` | `0` | - | Goals/Points for Away side. |
| **start_time** | `timestamptz` | - | - | The scheduled kickoff time for this match. |
| **field_name** | `text` | - | - | Physical field/pitch assignment (e.g. "Field A"). |
| **is_final** | `boolean` | `false` | - | Completion flag. |
| **is_playoff** | `boolean` | `false` | - | Marks this match as a playoff bracket entry. |
| **tournament_stage** | `text` | `group` | - | Stage: `group`, `semi_final`, `final`. |
| **match_phase** | `text` | `pre_game` | - | Phase: `first_half`, `halftime`, `second_half`, etc. |
| **status** | `text` | `scheduled` | - | Readiness state. |
| **timer_status** | `text` | `stopped` | - | Logic flag for UI countdowns. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[games (supabase).md]] | `game_id` | The parent event. |
| **has_many** | [[match_players (supabase).md]] | `match_id` | Individual match participants. |
| **belongs_to** | [[teams (supabase).md]] | `home_team_id` | Home team relation (Rolling League). |
| **belongs_to** | [[teams (supabase).md]] | `away_team_id` | Away team relation (Rolling League). |

---

**The `matches` table tracks the granular score and lifecycle of individual match-ups within a larger tournament context.**