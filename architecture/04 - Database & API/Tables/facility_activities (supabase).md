# 🗄️ Table: facility_activities

**Domain:** #database #infrastructure #governance **Primary Key:** `(facility_id, activity_type_id)` (Composite)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**facility_id**|`uuid`|(PK/FK) Reference to the parent venue facilities.|
|**activity_type_id**|`uuid`|(PK/FK) Reference to the global sport category activity_types.|
|**created_at**|`timestamp`|Record of when the activity was officially "enabled" at the venue.|

## 🔗 Relationships

- **belongs_to** facilities (`facility_id`) - Identifies the hosting venue.
- **belongs_to** activity_types (`activity_type_id`) - Identifies the specific supported sport.
- **Used By**: The "Marketplace Filtering" engine and the "Venue Profile" display (e.g., "This center offers Soccer and Tennis").

## 🛡️ RLS & Governance

- **Select**: Publicly readable. Mandatory for the public search UI (e.g., "Find all venues near me that support Pickleball").
- **Insert/Delete**: Strictly restricted to the **Facility Admin** of the associated venue or a **Super Admin**.
- **The "Venue Capability" Anchor**: This table serves as the primary filter for the public marketplace. If a venue does not have an entry here for a specific sport, it will be excluded from all search queries for that activity, even if it has physical resources that match.

---

**The `facility_activities` table is the platform's "Global Capability Map," mathematically defining which sports and services a physical venue is officially authorized to host.**