# 🗄️ Table: matches

**Domain:** #database #competition **Primary Key:** `id` (UUID)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**id**|`uuid`|Primary unique identifier for the specific match pairing.|
|**game_id**|`uuid`|(FK) Reference to the parent event (`games` table).|
|**home_team**|`text`|The name or identifier of the "Home" squad.|
|**away_team**|`text`|The name or identifier of the "Away" squad.|
|**home_score**|`int4`|Current (or final) goals/points for the home team.|
|**away_score**|`int4`|Current (or final) goals/points for the away team.|
|**start_time**|`timestamp`|The specific kickoff time for this individual match.|
|**round_number**|`int4`|Index for scheduling (Reserved: 99=Semi, 100=Final).|
|**status**|`text`|Match state: `scheduled`, `in_progress`, `completed`.|
|**tournament_stage**|`text`|Competitive phase: `group`, `semi_final`, `final`.|
|**is_playoff**|`boolean`|Flag used to bridge the match to knockout bracket logic.|
|**field_name**|`text`|Display name of the specific pitch (e.g., "Field 1").|
|**referee_id**|`uuid`|(FK) Reference to the `profiles` table for the assigned official.|

## 🔗 Relationships

- **belongs_to** games (`game_id`)
- **belongs_to** profiles (`referee_id`)
- **has_many** match_players (Junction table for lineups)

## 🛡️ RLS & Governance

- **Select**: Publicly readable while the parent game is `active`.
- **Update**: Restricted to the facility host or the assigned `referee_id`.
- **Realtime Logic**: Updates to `home_score` and `away_score` are broadcast via Supabase Realtime to the `LiveProjectorPage` and `FieldProjector`.

---

**The `matches` table is the "Competitive Heartbeat" of the platform, providing the granular data needed for real-time scoreboards and tournament standings.**