# 🗄️ Table: system_settings

**Domain:** #database #cms  **Primary Key:** `key` (Text)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **key** | `text` | - | - | Unique configuration key (e.g. `maintenance_mode`). |
| **value** | `jsonb` | `true` | - | The value stored in JSON format. |
| **label** | `text` | - | - | Human-readable name (Admin UI). |
| **category** | `text` | `general` | - | Grouping: `general`, `auth`, `experimental`. |
| **description** | `text` | - | - | Support text for administrators. |

---

**The `system_settings` table stores persistent application-wide configurations and feature flags.**