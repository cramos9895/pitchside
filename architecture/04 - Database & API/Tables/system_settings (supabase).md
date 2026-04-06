# 🗄️ Table: system_settings

**Domain:** #database #governance **Primary Key:** `key` (TEXT)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**key**|`text`|Primary unique identifier for the setting (e.g., `payment.venmo_handle`).|
|**value**|`jsonb`|Polymorphic field for the setting data (supports booleans, numbers, or strings).|
|**description**|`text`|Internal administrative note for support and developers.|
|**updated_at**|`timestamp`|Auto-generated tracking for configuration changes.|

## 🔗 Relationships

- **None**. This is a standalone configuration store used by several high-level services.

## 🛡️ RLS & Governance

- **Select**: Publicly readable for certain namespaces (`payment.*`), restricted to Super Admins for internal platform flags.
- **Update**: Strictly restricted to **Super-Admins** and **Master-Admins**.
- **Real-Time Usage**: Used by `[[src/lib/email.ts]]` to check if a specific notification type is currently enabled before the platform dispatches a Resend API call.

---

**The `system_settings` table is the platform's "Configuration Switchboard," providing a low-latency, non-code-deploy mechanism for toggling features and updating global payment instructions.**