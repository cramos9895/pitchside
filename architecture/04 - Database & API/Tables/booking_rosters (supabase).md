# 🗄️ Table: booking_rosters

**Domain:** #database #facility  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique record identifier. |
| **booking_group_id** | `uuid` | - | `recurring_booking_groups.id` | The parent rental group. |
| **user_id** | `uuid` | - | `profiles.id` | The participant player. |
| **joined_at** | `timestamp` | `now()` | - | Audit timestamp. |
| **is_checked_in** | `boolean` | `false` | - | Attendance flag for facility staff. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[recurring_booking_groups (supabase).md]] | `booking_group_id` | The rental context. |
| **belongs_to** | [[profiles (supabase).md]] | `user_id` | The player profile. |

---

**The `booking_rosters` table tracks participants for facility rentals, separate from the public `games` engine.**
<!-- slide -->
# 🗄️ Table: waiver_signatures

**Domain:** #database #legal  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique signature identifier. |
| **user_id** | `uuid` | - | `profiles.id` | The signer. |
| **facility_id** | `uuid` | - | `facilities.id` | The venue for which the waiver applies. |
| **agreed_at** | `timestamp` | `now()` | - | Legal timestamp of acceptance. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[profiles (supabase).md]] | `user_id` | The player signing. |
| **belongs_to** | [[facilities (supabase).md]] | `facility_id` | The venue being protected. |

---

**The `waiver_signatures` table stores the digital paper trail of legal agreements, required for facility check-in.**
<!-- slide -->
# 🗄️ Table: security_logs

**Domain:** #database #security  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Log entry identifier. |
| **identifier** | `text` | - | - | Throttling key (either UserID or IP Address). |
| **path** | `text` | - | - | The specific API/Action endpoint being limited. |
| **created_at** | `timestamp` | `now()` | - | Timestamp of the attempt. |

---

**The `security_logs` table powers the platform's rate-limiting system, tracking sensitive requests to prevent spam and brute-force attacks.**
