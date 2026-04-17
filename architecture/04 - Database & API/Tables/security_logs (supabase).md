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
