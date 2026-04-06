# 🧩 ResourceItem

**Type:** #component **Location:** `src/components/admin/ResourceItem.tsx`

## 📥 Props Received

- **resource** (object):
    - `id` (string)
    - `name` (string)
    - `description` (string | null)

## 🎛️ Local State & UI Logic

- **`isEditing`**: Manages the local UI transition between a static display and a multi-field administrative form.
- **In-Place Form Logic**: Replaces the row with dual text inputs for simultaneous `name` and `description` editing, utilizing `defaultValue` to maintain non-destructive UX.
- **Hover Reveal Interaction**: Shared design pattern with `ActivityItem` where granular controls (Edit/Delete) are hidden within a `group` container until targeted by the cursor.
- **`isPending`**: Disables interaction and provides a `Loader2` feedback loop during server-side database synchronization.

## 🔗 Used In (Parent Pages)

- `src/app/admin/(dashboard)/settings/resources/page.tsx`

## ⚡ Actions & API Triggers

- **[[updateResourceType]]**: Triggers a global update to the resource archetype metadata (e.g., changing "Court" to "Professional Grade Court").
- **[[deleteResourceType]]**: Dispatches a deletion request via a scoped form action.
- **Next.js Server Actions**: Leverages automated cache revalidation to ensure the resource list remains fresh across all administrative sessions.

---

**ResourceItem manages the high-level physical taxonomy of the platform (Fields, Courts, Rooms), ensuring that venue-specific naming conventions align with the system's global resource registry.**