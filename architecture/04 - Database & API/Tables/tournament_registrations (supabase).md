# 🗄️ Table: tournament_registrations

**Domain:** #database #competition  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique signup identifier. |
| **game_id** | `uuid` | - | `games.id` | The parent tournament event. |
| **league_id** | `uuid` | - | `leagues.id` | The parent competition context. |
| **user_id** | `uuid` | - | `profiles.id` | The individual player signing up. |
| **team_id** | `uuid` | - | `teams.id` | Optional: The team being registered. |
| **status** | `text` | `registered` | - | State: `registered`, `drafted`, `waitlisted`, `cancelled`. |
| **payment_status** | `text` | `pending` | - | Transactional state. |
| **preferred_positions** | `_text` | - | - | Array of sport-specific positions. |
| **stripe_setup_intent_id** | `text` | - | - | Reference for card collection/autocharge. |

---

**The `tournament_registrations` table handles the enrollment flow for competitive events, supporting both individual free agents and full teams.**