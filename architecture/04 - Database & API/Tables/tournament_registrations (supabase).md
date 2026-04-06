# 🗄️ Table: tournament_registrations

**Domain:** #database #competition  
**Primary Key:** `id` (UUID)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**id**|`uuid`|Primary unique identifier for the registration entry.|
|**user_id**|`uuid`|(FK) Reference to the profile identity (`profiles` table).|
|**league_id**|`uuid`|(FK) Link to the parent season (`leagues` table).|
|**game_id**|`uuid`|(FK) Link to the specific tournament match or bracket (`games` table).|
|**team_id**|`uuid`|(FK) Link to the assigned squad. **NULL** indicates a Free Agent.|
|**role**|`text`|Functional role within the squad: `captain`, `player`, `official`.|
|**status**|`text`|Current roster position: `registered`, `waitlist`, `checked_in`, `drafted`.|
|**preferred_positions**|`jsonb`|Array of roles (e.g., `["Goalie", "Defense"]`) for draft scouting.|
|**created_at**|`timestamp`|Auto-generated record tracking.|

## 🔗 Relationships

- **belongs_to** profiles (`user_id`)
- **belongs_to** leagues (`league_id`)
- **belongs_to** games (`game_id`)
- **belongs_to** teams (`team_id`)
- **has_many** league_matches (indirectly via `team_id` or `user_id` roster checks).

## 🛡️ RLS & Governance

- **Select**: Users can read their own registrations; Captains can read all registrations for their `team_id`.
- **Insert**: Publicly accessible via registration actions, but requires atomic checks for `league.status` and `registration_cutoff`.
- **The "Draft Pool" Logic**: This table is the platform's primary drafted marketplace. Records with `team_id: NULL` are treated as the available draft pool for squad captains utilizing the `[[draft-player]]` logic.
- **Bypass**: High-authority roster moves and "Team Manager" rebalancing utilize `createAdminClient()` to bypass standard participant RLS.

---

**The `tournament_registrations` table is the platform's "Competitive Roster Hub," mathematically linking player identities to their team, league, and specific drafting status.**