# 🗄️ Table: resource_activities

**Domain:** #database #infrastructure #governance **Primary Key:** `(resource_id, activity_type_id)` (Composite)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**resource_id**|`uuid`|(PK/FK) Reference to the parent pitch or court resources.|
|**activity_type_id**|`uuid`|(PK/FK) Reference to the global sport category activity_types.|
|**created_at**|`timestamp`|Record of when the resource was officially designated as compatible with the sport.|

## 🔗 Relationships

- **belongs_to** resources (`resource_id`) - Identifies the specific field or court.
- **belongs_to** activity_types (`activity_type_id`) - Identifies the sport itself.
- **Used By**: The "Game Creation" validator and the administrative field-management dashboard.

## 🛡️ RLS & Governance

- **Select**: Publicly readable. Essential for venue builders and the "Match-Field" configuration UI.
- **Insert/Delete**: Strictly restricted to the **Facility Admin** of the venue owning the resource (`auth.uid()` checked via `profiles.facility_id`) or a **Super Admin**.
- **The "Physical Constraint" Guard**: This table serves as the platform's "Safety Logic." When an administrator attempts to schedule a game for a specific sport (e.g., "Soccer"), the system queries this table to filter the list of available fields, ensuring that only resources physically configured for Soccer (e.g., Turf Field, No Net) are selectable.

---

**The `resource_activities` table is the platform's "Inventory Ruleset," mathematically defining the physical compatibility of each individual field or court with the various sport categories across the ecosystem.**