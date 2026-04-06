# 🗄️ Table: resources

**Domain:** #database #infrastructure  
**Primary Key:** `id` (UUID)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**id**|`uuid`|Primary unique identifier for the physical field or court.|
|**facility_id**|`uuid`|(FK) Reference to the parent venue (`facilities` table).|
|**name**|`text`|The display name of the resource (e.g., "Full Pitch A", "Court 3").|
|**resource_type_id**|`uuid`|(FK) Taxonomy link to the global `resource_types` (e.g., "Soccer Pitch").|
|**default_hourly_rate**|`int4`|The base rental price in cents, used for public reservation requests.|
|**is_active**|`boolean`|Flag used to toggle visibility and bookability in the marketplace.|
|**created_at**|`timestamp`|Auto-generated record tracking.|

## 🔗 Relationships

- **belongs_to** facilities (`facility_id`)
- **belongs_to** resource_types (`resource_type_id`)
- **has_many** resource_activities - Junction table linking fields to allowed sports.
- **has_many** resource_bookings - The primary calendar entries for this resource.
- **has_many** league_resources - Link to leagues that utilize this specific field.

## 🛡️ RLS & Governance

- **Select**: Publicly readable to show availability and resource names on venue pages.
- **Insert/Update**: Strictly restricted to the facility admin (`auth.uid()` verified via `profiles.facility_id`) or a Super Admin.
- **Logic**: Resources are the "Physical Anchor" for all scheduling; deleting a resource is typically blocked if active `resource_bookings` exist.

---

**The `resources` table is the platform's "Physical Inventory," mathematically representing the actual rentable space and its relationship to global sport taxonomies.**