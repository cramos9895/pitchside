# 🗄️ Tables: Junction Rules (`facility_activities` & `resource_activities`)

**Domain:** #database #infrastructure #governance **Primary Key:** Composite (See Below)

## 📄 Column Definitions: `facility_activities`

_This table defines the global sports/activities that a venue is capable of hosting._

|Column|Type|Description|
|---|---|---|
|**facility_id**|`uuid`|(PK/FK) Reference to the parent venue facilities.|
|**activity_type_id**|`uuid`|(PK/FK) Reference to the global sport category activity_types.|
|**created_at**|`timestamp`|Record of when the activity was officially "enabled" at the venue.|

## 📄 Column Definitions: `resource_activities`

_This table provides granular control, defining which specific sports can be played on which specific field/court._

|Column|Type|Description|
|---|---|---|
|**resource_id**|`uuid`|(PK/FK) Reference to the specific pitch or court resources.|
|**activity_type_id**|`uuid`|(PK/FK) Reference to the global sport category activity_types.|
|**created_at**|`timestamp`|Record of when the resource was designated as compatible with the sport.|

## 🔗 Relationships

- **belongs_to** facilities or resources - To identify the owner of the capability.
- **belongs_to** activity_types - To identify the sport itself.
- **Used By**: The "Marketplace Filtering" engine and the "Game Creation" validator.

## 🛡️ RLS & Governance

- **Select**: Publicly readable. Essential for the public search UI (e.g., "Find all venues near me that support Pickleball").
- **Insert/Delete**: Restricted to the **Facility Admin** of the associated venue or a **Super Admin**.
- **The "Physical Capability" Guard**: These junction tables serve as the platform's "Logic Filter." When an administrator attempts to schedule a "Tournament" or "Pickup Game," the system queries these tables to ensure the selected `resource` (Field 1) is physically and legally configured for the chosen sport (Activity Type).

---

**The "Junction Rules" are the platform's "Capability Matrix," mathematically defining the relationship between physical space and competitive activity across the ecosystem.**