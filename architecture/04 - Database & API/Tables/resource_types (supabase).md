# 🗄️ Table: resource_types

**Domain:** #database #taxonomy  
**Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column          | Type        | Description                                                                      |
| --------------- | ----------- | -------------------------------------------------------------------------------- |
| **id**          | `uuid`      | Primary unique identifier for the specific taxonomy of resource.                 |
| **name**        | `text`      | The public name of the category (e.g., "Full Soccer Pitch", "Padel Court").      |
| **description** | `text`      | Descriptive context regarding the dimensions or standard use-case for this type. |
| **created_at**  | `timestamp` | Auto-generated record tracking.                                                  |

## 🔗 Relationships

- **has_many** resources (via `resource_type_id`) - Acts as the template for individual physical fields.

## 🛡️ RLS & Governance

- **Select**: Publicly readable. Essential for venue builders and marketplace filtering.
- **Insert/Update/Delete**: Strictly restricted to **Super-Admins** and **Master-Admins** via `[[src/app/actions/master-settings.ts]]`.
- **Integrity**: Deletion is blocked if the resource type is currently assigned to any physical `resources`, ensuring that the facility hierarchy remains intact.

---

**The `resource_types` table is the platform's "Infrastructure Taxonomy," mathematically defining the categories of playable space that physical venues can utilize.**