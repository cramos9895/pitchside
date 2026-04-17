# 🗄️ Table: team_players

**Domain:** #database #competition  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique membership identifier. |
| **team_id** | `uuid` | - | `teams.id` | The target squad. |
| **user_id** | `uuid` | - | `profiles.id` | The player member. |
| **role** | `text` | `player` | - | Role: `captain`, `player`, `coach`. |
| **status** | `text` | `pending` | - | Status: `pending`, `confirmed`, `rejected`. |
| **created_at** | `timestamp` | `now()` | - | Time of joining/invite. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[teams (supabase).md]] | `team_id` | The parent team. |
| **belongs_to** | [[profiles (supabase).md]] | `user_id` | The player profile. |

## 🛡️ RLS & Governance

- **Select**: Visible to team members and facility admins.
- **Insert**: Allowed for team captains or auto-insert via signup logic.
- **Update**: Restricted to captains or the specific player for status changes.

---

**The `team_players` table manages the many-to-many relationship between players and competitive squads.**
<!-- slide -->
# 🗄️ Table: league_resources

**Domain:** #database #facility  **Primary Key:** `league_id, resource_id`

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **league_id** | `uuid` | - | `leagues.id` | The competition. |
| **resource_id** | `uuid` | - | `resources.id` | The physical field reserved. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[leagues (supabase).md]] | `league_id` | The parent league. |
| **belongs_to** | [[resources (supabase).md]] | `resource_id` | The designated field. |

---

**The `league_resources` table maps specific facility fields to leagues, ensuring correct scheduling boundaries.**
<!-- slide -->
# 🗄️ Table: recurring_booking_groups

**Domain:** #database #facility  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | - | - | Group identifier for linked bookings. |
| **facility_id** | `uuid` | - | `facilities.id` | The venue providing the rentals. |
| **user_id** | `uuid` | - | `profiles.id` | The owner/renter. |
| **payment_term** | `text` | - | - | Billing cycle: `upfront`, `weekly`. |
| **final_price** | `int4` | `0` | - | Total derived price for the series. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[facilities (supabase).md]] | `facility_id` | The providing venue. |
| **belongs_to** | [[profiles (supabase).md]] | `user_id` | The responsible renter. |
| **has_many** | [[resource_bookings (supabase).md]] | `recurring_group_id` | Individual booking instances. |

---

**The `recurring_booking_groups` table allows multiple facility rentals (e.g., Every Monday at 8pm) to be managed as a single financial entity.**
