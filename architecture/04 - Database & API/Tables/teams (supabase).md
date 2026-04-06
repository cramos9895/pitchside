# 🗄️ Table: teams

**Domain:** #database #competition  
**Primary Key:** `id` (UUID)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**id**|`uuid`|Primary unique identifier for the squad or competitive unit.|
|**league_id**|`uuid`|(FK) Reference to the parent `leagues` record for season-long play.|
|**game_id**|`uuid`|(FK) Reference to a standalone tournament event (`games` table).|
|**name**|`text`|The public name of the squad (e.g., "Real FC").|
|**captain_id**|`uuid`|(FK) The profile ID of the user with administrative "Captain" rights.|
|**primary_color**|`text`|Hex code used for UI jersey representation and scoreboard identity.|
|**status**|`text`|Lifecycle state: `pending`, `approved`, `withdrawn`.|
|**accepting_free_agents**|`boolean`|Flag used by the `[[draft-player]]` logic to toggle recruitment settings.|
|**created_at**|`timestamp`|Auto-generated record audit trail.|

## 🔗 Relationships

- **belongs_to** leagues (`league_id`)
- **belongs_to** games (`game_id`)
- **belongs_to** profiles (`captain_id`)
- **has_many** tournament_registrations (via `team_id`) - The actual roster of players assigned to this squad.
- **has_many** matches (via `home_team` or `away_team` text/id mapping).

## 🛡️ RLS & Governance

- **Select**: Publicly readable while the parent league is `active`.
- **Update**: Restricted to the owner (`auth.uid() = captain_id`) or a Super Admin. Specifically used to manage recruitment settings via `[[src/app/actions/draft-player.ts]]`.
- **Integrity Logic**: The `teams` table is the formal persistent layer for competitions. Pickup games often bypass this table in favor of lightweight JSONB `teams_config` in the `games` record, whereas Leagues/Tournaments require the granular control this table provides.

---

**The `teams` table is the platform's "Squad Registry," mathematically grouping individual participants into cohesive competitive units for league play and tournament brackets.**