# 🗄️ Table: league_matches

**Domain:** #database #competition #scheduling **Primary Key:** `id` (UUID)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**id**|`uuid`|Primary unique identifier for the specific league match.|
|**league_id**|`uuid`|(FK) Reference to the parent leagues competition.|
|**home_team_id**|`uuid`|(FK) Reference to the home squad in the teams table.|
|**away_team_id**|`uuid`|(FK) Reference to the visiting squad in the teams table.|
|**week_number**|`integer`|The scheduled week/round of the season (e.g., Week 1, Week 2).|
|**start_time**|`timestamp`|The official kick-off time for the match.|
|**status**|`text`|Lifecycle state: `scheduled`, `active`, `completed`, `cancelled`.|
|**home_score**|`integer`|Final goals recorded for the home team.|
|**away_score**|`integer`|Final goals recorded for the away team.|
|**match_type**|`text`|Classification: `regular_season`, `playoff`, or `final`.|

## 🔗 Relationships

- **belongs_to** leagues (`league_id`) - Ties the match to a specific season/competition.
- **belongs_to** teams (`home_team_id` / `away_team_id`) - Identifies the two competing squads.
- **Consumed By**: The `[[league-actions]]` and `[[league-matches (action)]]` server actions to update standings and schedules.

## 🛡️ RLS & Governance

- **Select**: Publicly readable. This table powers the public "Season Schedule" and the "Recent Results" sections of the league landing pages.
- **Update**: Strictly restricted to the **Facility Admin** of the venue owning the league or a **Super Admin**.
- **Standings Authority**: This table is the "Source of Truth" for competitive rankings. Any change to the `status` (to `completed`) or the score columns triggers a revalidation of the point-table, goal difference, and win/loss records displayed in the `StandingsTable` component.

---

**The `league_matches` table is the platform's "Season Ledger," mathematically organizing the temporal pairings and competitive results that define a league's progression and standings.**