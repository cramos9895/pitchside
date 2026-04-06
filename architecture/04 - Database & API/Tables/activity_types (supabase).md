# 🗄️ Table: activity_types

**Domain:** #database #taxonomy **Primary Key:** `id` (UUID)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**id**|`uuid`|Primary unique identifier for the sport or activity.|
|**name**|`text`|The public name of the sport (e.g., "Soccer", "Basketball").|
|**color_code**|`text`|Hex code used for consistent UI representation (calendars, tags, scoreboards).|
|**created_at**|`timestamp`|Auto-generated record tracking.|

## 🔗 Relationships

- **has_many** resource_activities - Junction linking specific sports to specific physical resources.
- **has_many** facility_activities - Junction linking venues to their overall sport offerings.
- **has_many** games - Individual match sessions categorized by activity.
- **has_many** leagues - Season-long competitions.

## 🛡️ RLS & Governance

- **Select**: Publicly readable. Essential for marketplace filtering.
- **Insert/Update/Delete**: Strictly restricted to **Super-Admins** and **Master-Admins** via `[[src/app/actions/master-settings.ts]]`.
- **Integrity**: Deletion is blocked by the database if the activity type is currently in use by any resource, facility, or game.

---

**The `activity_types` table is the platform's "Sports Taxonomy," mathematically enforcing a consistent organizational structure for every event and facility in the PitchSide ecosystem.**