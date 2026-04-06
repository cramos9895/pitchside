# 🗄️ Table: platform_settings

**Domain:** #database #financial #governance **Primary Key:** `id` (Integer)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**id**|`int4`|Primary identity, strictly enforced to `1` (check constraint) to ensure a singleton configuration.|
|**fee_type**|`text`|The active financial model: `percent`, `fixed`, or `both`.|
|**fee_percent**|`numeric`|The platform percentage commission (e.g., `5.0` for 5%).|
|**fee_fixed**|`int4`|Fixed transaction fee stored in **cents** (e.g., `100` for $1.00) for Stripe compatibility.|
|**updated_at**|`timestamp`|Auto-generated audit trail for the last policy modification.|

## 🔗 Relationships

- **Singleton Logic**: This table has no external foreign key relationships. It acts as a standalone "Switchboard" for global platform policy, consumed by the `[[checkout]]`, `[[processLeaguePayments]]`, and `[[admin-financials]]` actions.

## 🛡️ RLS & Governance

- **Select**: Publicly readable. This is critical for the `[[checkout]]` engine to accurately calculate and display total costs (including platform fees) to participants and captains in real-time.
- **Update**: Strictly restricted to **Super Admins** or **Master Admins** via `[[admin-financials]]`.
- **Insert/Delete**: Hard-denied via RLS policies and table constraints. The platform relies on the existence of the unique `id = 1` row; adding rows or removing the singleton would break the global pricing calculations.
- **Security Bypass**: The `[[admin-financials]]` action uses a `createAdminClient()` to perform updates, ensuring that even if RLS were accidentally modified, only server-side-verified admins could alter the platform's revenue model.

---

**The `platform_settings` table is the platform's "Economic Heart," serving as the high-authority singleton that dictates the global financial ruleset for every transaction across the PitchSide network.**