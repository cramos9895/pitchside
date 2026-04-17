# 🗄️ Table: bookings

**Domain:** #database #finance  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique registration identifier. |
| **user_id** | `uuid` | - | `profiles.id` | The participant player. |
| **buyer_id** | `uuid` | - | `profiles.id` | The user who paid (may differ for gift registrations). |
| **game_id** | `uuid` | - | `games.id` | The match being joined. |
| **status** | `text` | `pending` | - | Status: `pending`, `paid`, `active`, `waitlist`, `cancelled`. |
| **payment_status** | `text` | `unpaid` | - | Status: `unpaid`, `pending`, `verified`, `refunded`. |
| **payment_amount** | `numeric` | `0` | - | Price paid in dollars. |
| **payment_method** | `text` | - | - | e.g., `stripe`, `credits`. |
| **team_assignment** | `text` | - | - | Numeric squad index for B2C rosters. |
| **checked_in** | `boolean` | `false` | - | Attendance flag. |
| **is_winner** | `boolean` | `false` | - | Match result flag. |
| **is_captain** | `boolean` | `false` | - | Flag for squad leadership status. |
| **roster_status** | `text` | `confirmed` | - | State: `confirmed`, `waitlisted`, `dropped`. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |
| **updated_at** | `timestamp` | `now()` | - | Audit timestamp. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[profiles (supabase).md]] | `user_id` | The participant player. |
| **belongs_to** | [[profiles (supabase).md]] | `buyer_id` | The paying user. |
| **belongs_to** | [[games (supabase).md]] | `game_id` | The target match. |

## 🛡️ RLS & Governance

- **Select**: Visible to the player, the buyer, or the venue owner.
- **Insert**: Allowed for authenticated users; balance check enforced in action.
- **Verification**: `checked_in` flag is only modifiable by facility staff.

---

**The `bookings` table manages individual player participation and financial status for all matches.**