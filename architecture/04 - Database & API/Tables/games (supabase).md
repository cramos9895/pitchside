# 🗄️ Table: games

**Domain:** #database #competition  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Primary unique identifier for the game/event session. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp for entity creation. |
| **title** | `text` | - | - | The public-facing name of the match (e.g., "Tuesday Night Pickup"). |
| **description** | `text` | - | - | Markdown-supported field for event rules or details. |
| **location** | `text` | - | - | Specific address or pitch identifier. |
| **start_time** | `timestamp` | - | - | The scheduled kickoff time. |
| **end_time** | `time` | - | - | The scheduled conclusion of the match. |
| **price** | `numeric` | `10.00` | - | The entrance fee (handled as dollars in UI). |
| **max_players** | `int4` | `22` | - | The total participation cap for the entire event. |
| **current_players** | `int4` | `0` | - | (Cached) Count of registered players. |
| **status** | `text` | `scheduled` | - | Lifecycle: `scheduled`, `active`, `completed`, `cancelled`. |
| **home_score** | `int4` | `0` | - | Final tally for the home side. |
| **away_score** | `int4` | `0` | - | Final tally for the away side. |
| **mvp_player_id** | `uuid` | - | `profiles.id` | The profile ID of the player awarded MVP status. |
| **has_mvp_reward** | `boolean` | `false` | - | If true, enables credit distribution upon finalization. |
| **facility_id** | `uuid` | - | `facilities.id` | The parent venue owning this game. |
| **resource_id** | `uuid` | - | `resources.id` | The specific physical field/court. |
| **event_type** | `text` | `standard` | - | Type: `standard`, `tournament`, `league`. |
| **view_mode** | `text` | `single` | - | UI display mode. |
| **timer_status** | `text` | `stopped` | - | Game clock state: `stopped`, `running`, `paused`. |
| **league_format** | `text` | `structured` | - | Format: `structured`, `rolling`. |
| **payment_collection_type** | `text` | `stripe` | - | `stripe` or `cash`. |
| **cash_fee_structure** | `text` | - | - | e.g., 'Weekly', 'Seasonal', 'Per Match'. |
| **cash_amount** | `numeric` | - | - | Fee if cash collection is active. |
| **allow_free_agents** | `boolean` | `false` | - | Whether FA registration is open. |
| **team_registration_fee** | `numeric` | - | - | Deposit/Registration fee for teams. |
| **deduct_team_reg_fee** | `boolean` | `false` | - | If true, reg fee is subtracted from total price. |
| **player_registration_fee** | `numeric` | - | - | Registration fee for individuals. |
| **league_end_date** | `timestamp` | - | - | Targeted season conclusion date. |
| **total_game_time** | `int4` | - | - | Total duration of the slot in minutes. |
| **field_size** | `text` | - | - | e.g. 7v7, 5v5, Full Pitch. |
| **shoe_types** | `text[]` | - | - | Array of allowed footwear (Cleats, Turfs, etc). |
| **amount_of_fields** | `int4` | `1` | - | Number of concurrent fields used. |
| **field_names** | `text[]` | - | - | Labels for individual fields. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[facilities (supabase).md]] | `facility_id` | The owning venue. |
| **belongs_to** | [[resources (supabase).md]] | `resource_id` | The physical field site. |
| **belongs_to** | [[profiles (supabase).md]] | `mvp_player_id` | The awarded MVP player profile. |
| **has_many** | [[bookings (supabase).md]] | `game_id` | Individual player registrations. |
| **has_many** | [[matches (supabase).md]] | `game_id` | Tournament/League match sessions. |

## 🛡️ RLS & Governance

- **Select**: Publicly readable for `active` games; restricted to participants for `completed` games.
- **Insert/Update**: Highly restricted to the assigned `facility_id` owner or `master_admin`.
- **Logic Triggers**: Updates to `status: 'completed'` trigger credit injections via `[[src/app/actions/finalize-game.ts]]`.

---

**The `games` table is the "Operational Core" of PitchSide, serving as the central node connecting venues, players, and financial transactions.**