# 🗄️ Table: messages

**Domain:** #database #social  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique identifier for each chat message. |
| **event_id** | `uuid` | - | `games.id` | The specific game/event thread. |
| **user_id** | `uuid` | - | `profiles.id` | The sender of the message. |
| **content** | `text` | - | - | The message body text. |
| **created_at** | `timestamp` | `now()` | - | Time of message submission. |
| **is_broadcast** | `boolean` | `false` | - | If true, message was sent by an admin/host to all participants. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[games (supabase).md]] | `event_id` | The target event chat. |
| **belongs_to** | [[profiles (supabase).md]] | `user_id` | The message author. |

## 🛡️ RLS & Governance

- **Select**: Visible to all participants of the linked `event_id`.
- **Insert**: Allowed for any authenticated user who is a participant of the event.
- **Update/Delete**: Restricted to the sender or a `master_admin`.

---

**The `messages` table handles real-time coordination and community engagement within specific game sessions.**
