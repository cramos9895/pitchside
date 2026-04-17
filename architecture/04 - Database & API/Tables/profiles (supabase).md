# 🗄️ Table: profiles

**Domain:** #database #identity  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | - | `auth.users.id` | Link to the internal Supabase Auth record. |
| **email** | `text` | - | - | User's login email address. |
| **full_name** | `text` | - | - | Public display name. |
| **avatar_url** | `text` | - | - | Managed asset link for profile photos. |
| **role** | `text` | `player` | - | Player role: `player`, `admin`, `master_admin`. |
| **system_role** | `text` | `player` | - | Backend role: `player`, `facility_admin`, `super_admin`. |
| **verification_status** | `text` | `verified` | - | Status: `verified`, `pending`, `rejected`. |
| **credit_balance** | `int4` | `0` | - | User's internal wallet balance (cents). |
| **free_game_credits** | `int4` | `0` | - | Available free-play MVP rewards. |
| **is_free_agent** | `boolean` | `false` | - | Visible to captains for recruitment. |
| **facility_id** | `uuid` | - | `facilities.id` | The venue managed by this profile (Staff only). |
| **stripe_customer_id** | `text` | - | - | Secure reference for external payments. |
| **zip_code** | `text` | - | - | Location context for local match discovery. |
| **is_banned** | `boolean` | `false` | - | Global platform exclusion flag. |
| **ban_reason** | `text` | - | - | Administrative justification for ban. |
| **updated_at** | `timestamp` | - | - | Last modification audit. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | `auth.users` | `id` | Core identity provider. |
| **belongs_to** | [[facilities (supabase).md]] | `facility_id` | Managing venue (Admin only). |
| **has_many** | [[bookings (supabase).md]] | `user_id` | Player registration history. |
| **has_many** | [[teams (supabase).md]] | `captain_id` | Teams led by this user. |

## 🛡️ RLS & Governance

- **Select**: Publicly readable for identification; sensitive balance fields restricted to owner or `master_admin`.
- **Update**: Restricted to the specific user (`id = auth.uid()`) or an administrative bypass.
- **Triggers**: Credits are automatically managed by the finalization engine.

---

**The `profiles` table is the "Identity Hub" of PitchSide, linking authentication to financial wallets, competitive stats, and permissions.**