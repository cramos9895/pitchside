# 🗄️ Table: leagues

**Domain:** #database #competition #financial  
**Primary Key:** `id` (UUID)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**id**|`uuid`|Primary unique identifier for the league/competition.|
|**facility_id**|`uuid`|(FK) Reference to the hosting venue (`facilities` table).|
|**name**|`text`|The public title of the competition (e.g., "Over-30 Men's Elite").|
|**season**|`text`|The temporal identifier (e.g., "Summer 2024", "Season 1").|
|**activity_id**|`uuid`|(FK) The type of sport (`activity_types` table).|
|**status**|`text`|Lifecycle state: `draft`, `open`, `active`, `completed`, `cancelled`.|
|**price**|`numeric`|Full registration fee (dollars in UI, often processed as cents).|
|**max_players**|`int4`|The total capacity for individual registrations.|
|**max_teams**|`int4`|The total capacity for team-based registrations.|
|**min_roster**|`int4`|The minimum number of players required for a team to be valid.|
|**max_roster**|`int4`|The hard cap on roster size per team.|
|**start_date**|`date`|The calendar date of the first scheduled match.|
|**end_date**|`date`|The calendar date of the final championship match.|
|**registration_cutoff**|`timestamp`|The hard deadline for new player or team registrations.|
|**format**|`text`|League structure: `bracket`, `round_robin`, `group_stage`.|
|**game_length**|`int4`|Fixed duration of standard matches in minutes.|
|**game_periods**|`text`|Internal match structure (e.g., "2x25min halves").|
|**game_days**|`text`|Predefined weekdays for play (e.g., "Monday, Wednesday").|
|**has_playoffs**|`boolean`|Flag indicating if a knockout bracket follows the regular season.|
|**playoff_spots**|`int4`|The number of teams that qualify for the post-season bracket.|
|**time_range_start**|`time`|The earliest possible kickoff time for match generation.|
|**time_range_end**|`time`|The latest possible kickoff time for match generation.|

## 🔗 Relationships

- **belongs_to** facilities (`facility_id`)
- **has_many** teams (via `league_id`)
- **has_many** games (via `league_id`) - For individual match sessions.
- **has_many** tournament_registrations (via `league_id`)

## 🛡️ RLS & Governance

- **Select**: Publicly readable while `status != 'draft'`.
- **Update**: Strictly restricted to the hosting `facility_id` owner or a Super Admin via `[[src/app/actions/facility.ts]]`.
- **Logic Gates**: `registration_cutoff` is enforced by the registration engine (`[[league-registration]]`) to prevent post-deadline entries.

---

**The `leagues` table is the "Competitive Blueprint," mathematically defining the constraints, scheduling, and financial requirements for long-term competition cycles.**