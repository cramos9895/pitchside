# 🗄️ Table: match_players

**Domain:** #database #competition #stats **Primary Key:** `id` (UUID)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**id**|`uuid`|Primary unique identifier for the match-player link.|
|**match_id**|`uuid`|(FK) Reference to the parent matches record.|
|**player_id**|`uuid`|(FK) Reference to the user's profiles record.|
|**team_id**|`uuid`|(FK) Indicates which teams record the player is representing in this specific match.|
|**check_in_time**|`timestamp`|The timestamp when the player was physically verified at the pitch.|
|**is_captain**|`boolean`|Flag indicating if the player served as the on-field captain for this match.|
|**goals**|`int4`|Total goals scored by the player during the match.|
|**assists**|`int4`|Total assists recorded by the player.|
|**yellow_cards**|`int4`|Disciplinary record (Cautions).|
|**red_cards**|`int4`|Disciplinary record (Ejections).|
|**created_at**|`timestamp`|Auto-generated match-entry audit trail.|

## 🔗 Relationships

- **belongs_to** matches (`match_id`) - Link to the specific game session.
- **belongs_to** profiles (`player_id`) - Link to the participant's global identity.
- **belongs_to** teams (`team_id`) - Link to the squad assignment for the match.

## 🛡️ RLS & Governance

- **Select**: Publicly readable. This is the primary data source for live scoreboards, match lineup cards, and tournament-wide goal-scorer leaderboards.
- **Update**: Restricted to the **assigned referee** or the **facility host**. Normal players cannot modify their own stats or check-in status.
- **Finalization Lock**: Once the match status is transition to `completed` via `[[finalizeGame]]`, these records are treated as "Locked" to ensure the integrity of season-long standings and golden-boot awards.

---

**The `match_players` table is the platform's "Roster Ledger," providing the granular, per-match statistics and verification data that power the competitive leaderboard and player history engines.**