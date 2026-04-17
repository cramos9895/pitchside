# 🗄️ Table: platform_settings

**Domain:** #database #cms  **Primary Key:** `id` (Int)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `int4` | - | - | Singleton identifier (must be 1). |
| **fee_type** | `text` | `percent` | - | Calculation: `percent`, `fixed`, `both`. |
| **fee_percent** | `numeric` | `5.0` | - | Percentage-based service fee. |
| **fee_fixed** | `integer` | `100` | - | Fixed dollar surcharge (in cents). |
| **updated_at** | `timestamp` | `now()` | - | Last modification audit. |

## 🛡️ RLS & Governance

- **Select**: Publicly readable (unauthenticated).
- **Update**: Restricted to `master_admin` roles.

---

**The `platform_settings` table stores global financial constants and operational toggles.**