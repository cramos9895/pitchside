# 🗄️ Table: teams

**Domain:** #database #competition  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique team identifier. |
| **league_id** | `uuid` | - | `leagues.id` | The parent competition. |
| **game_id** | `uuid` | - | `games.id` | Link if team is for a one-off tournament. |
| **name** | `text` | - | - | Public team name. |
| **captain_id** | `uuid` | - | `profiles.id` | The team leader. |
| **status** | `text` | `pending` | - | Status: `pending`, `approved`, `waitlisted`. |
| **primary_color** | `text` | - | - | hex code or name for UI. |
| **accepting_free_agents** | `boolean` | `false` | - | If true, team appears in recruitment pool. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[leagues (supabase).md]] | `league_id` | The parent competition. |
| **belongs_to** | [[profiles (supabase).md]] | `captain_id` | The team manager. |
| **has_many** | [[team_players (supabase).md]] | `team_id` | Roster members. |

---

**The `teams` table represents collective participant groups in leagues and tournaments.**
<!-- slide -->
# 🗄️ Table: matches

**Domain:** #database #competition  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique match instance identifier. |
| **game_id** | `uuid` | - | `games.id` | The parent tournament/event. |
| **home_team** | `text` | - | - | Team A identifier. |
| **away_team** | `text` | - | - | Team B identifier. |
| **home_score** | `int4` | `0` | - | Goals/Points for Home side. |
| **away_score** | `int4` | `0` | - | Goals/Points for Away side. |
| **is_final** | `boolean` | `false` | - | Completion flag. |
| **tournament_stage** | `text` | `group` | - | Stage: `group`, `semi_final`, `final`. |
| **match_phase** | `text` | `pre_game` | - | Phase: `first_half`, `halftime`, `second_half`, etc. |
| **status** | `text` | `scheduled` | - | Readiness state. |
| **timer_status** | `text` | `stopped` | - | Logic flag for UI countdowns. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[games (supabase).md]] | `game_id` | The parent event. |
| **has_many** | [[match_players (supabase).md]] | `match_id` | Individual match participants. |

---

**The `matches` table tracks the granular score and lifecycle of individual match-ups within a larger tournament context.**
<!-- slide -->
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
<!-- slide -->
# 🗄️ Table: match_players

**Domain:** #database #competition  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique record identifier. |
| **match_id** | `uuid` | - | `matches.id` | The specific match. |
| **user_id** | `uuid` | - | `profiles.id` | The player participant. |
| **is_checked_in** | `boolean` | `false` | - | Attendance flag. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[matches (supabase).md]] | `match_id` | The match context. |
| **belongs_to** | [[profiles (supabase).md]] | `user_id` | The player profile. |

---

**The `match_players` table tracks roster presence for individual matches, particularly in tournament settings.**