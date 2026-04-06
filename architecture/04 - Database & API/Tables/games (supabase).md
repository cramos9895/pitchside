# 🗄️ Table: games

**Domain:** #database #competition **Primary Key:** `id` (UUID)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**id**|`uuid`|Primary unique identifier for the game/event session.|
|**title**|`text`|The public-facing name of the match (e.g., "Tuesday Night Pickup").|
|**description**|`text`|Markdown-supported field for event rules or details.|
|**location**|`text`|Specific address or pitch identifier.|
|**start_time**|`timestamp`|The scheduled kickoff time.|
|**end_time**|`timestamp`|The scheduled conclusion of the match.|
|**price**|`numeric`|The entrance fee (handled as dollars in UI, cents in transactions).|
|**max_players**|`int4`|The total participation cap for the entire event.|
|**status**|`text`|Current lifecycle state: `active`, `completed`, `cancelled`.|
|**is_league**|`boolean`|Flag indicating if the game is part of a parent competition.|
|**league_id**|`uuid`|(FK) Reference to the `leagues` table if `is_league` is true.|
|**facility_id**|`uuid`|(FK) The parent venue owning this game.|
|**resource_id**|`uuid`|(FK) The specific physical field/court (`resources` table).|
|**activity_type_id**|`uuid`|(FK) The type of sport (`activity_types` table).|
|**teams_config**|`jsonb`|Array of team objects: `[{ name: string, color: hex, limit: int }]`.|
|**min_players_per_team**|`int4`|The minimum required roster size for competitive balance.|
|**max_teams**|`int4`|The maximum number of squads allowed in this session.|
|**has_mvp_reward**|`boolean`|If true, enables credit distribution upon `finalizeGame`.|
|**mvp_player_id**|`uuid`|(FK) The profile ID of the player awarded MVP status.|
|**checked_in_count**|`int4`|(Calculated) Real-time count of players present at the facility.|

## 🔗 Relationships

- **belongs_to** facilities (`facility_id`)
- **belongs_to** resources (`resource_id`)
- **belongs_to** leagues (`league_id`)
- **has_many** bookings (via `game_id`)
- **has_many** matches (via `game_id`)

## 🛡️ RLS & Governance

- **Select**: Publicly readable for `active` games; restricted to participants for `completed` games.
- **Insert/Update**: Strictly restricted to the assigned `facility_id` owner or a `master_admin`.
- **Logic Triggers**: Updates to `status: 'completed'` trigger credit injections and stat increments via `[[src/app/actions/finalize-game.ts]]`.

---

**The `games` table is the "Operational Core" of PitchSide, serving as the central node connecting venues, players, and financial transactions.**