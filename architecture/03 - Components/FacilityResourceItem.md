# 🧩 FacilityResourceItem

**Type:** #component **Location:** `src/components/facility/FacilityResourceItem.tsx`

## 📥 Props Received

- **resource** (object): The specific court, pitch, or room data, including nested `resource_activities`.
- **resourceTypes** (array): The global dictionary of physical types (Field, Court, Room).
- **activityTypes** (array): The global dictionary of sports categories (Soccer, Volleyball, etc.).
- **isSuperAdmin** (boolean): Determines if the facility name column should be rendered.

## 🎛️ Local State & UI Logic

- **`isEditing`**: Toggles the table row's rendering mode from a read-only data display to an inline grid-based form.
- **Activity Multi-Selector**:
    - **`selectedActivities`**: A `Set<string>` that manages the many-to-many relationship between the physical resource and the sports it supports.
    - **Custom Dropdown**: Implements a floating selection pane with color-coded activity indicators and validation that prevents saving with zero selected activities.
- **Inline CRUD UX**:
    - Replaces the row with a 12-column sub-grid containing name, hourly rate, and type inputs.
    - Provides immediate visual feedback via a `Loader2` spinner within the `Check` button during async persistence.
- **Currency Translation**: Converts backend-stored integer cents to human-readable decimals (`$75.00` instead of `7500`) with `step="0.01"` precision in the editor.

## 🔗 Used In (Parent Pages)

- `src/app/admin/(dashboard)/facilities/[id]/resources/page.tsx`
- `src/app/facility/admin/resources/page.tsx`

## ⚡ Actions & API Triggers

- **[[updateResource]]**: A server-side transaction that updates the core resource record and synchronizes the list of supported activity types in the joining table.
- **[[deleteResource]]**: Triggers a hard deletion of the physical resource after a native confirmation prompt.
- **`useToast`**: Dispatches system notifications to confirm successful inventory modifications.

---

**FacilityResourceItem manages the specific physical inventory of a venue, allowing for granular control over what sports can be played on which surfaces and at what price.**