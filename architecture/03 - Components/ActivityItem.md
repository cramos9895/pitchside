# 🧩 ActivityItem

**Type:** #component **Location:** `src/components/admin/ActivityItem.tsx`

## 📥 Props Received

- **activity** (object):
    - `id` (string)
    - `name` (string)
    - `color_code` (string - Hex color)

## 🎛️ Local State & UI Logic

- **`isEditing`**: Toggles the row between a read-only display and an inline form interface for rapid metadata updates.
- **`isPending`**: Manages the button lifecycle during server-side processing to prevent duplicate submissions.
- **In-Place Color Picker**: Utilizes a native HTML color input consistent with the `color_code` property, allowing admins to visually map sport archetypes to specific UI highlights.
- **Hover Reveal Interaction**: Administrative actions (Edit/Delete) are sequestered within a `group-hover` utility, maintaining a clean, data-dense interface that only reveals controls upon direct user intent.

## 🔗 Used In (Parent Pages)

- `src/app/admin/(dashboard)/settings/activities/page.tsx`

## ⚡ Actions & API Triggers

- **[[updateGlobalActivityType]]**: A server-side transaction that rebrands the activity or updates its global color token.
- **[[deleteGlobalActivityType]]**: Immediately purges the activity archetype from the global registry via a form action.
- **Optimistic/Form Revalidation**: Relies on Next.js server actions to automatically re-render the parent list upon successful mutation.

---

**ActivityItem provides a lightweight, focused interface for managing the global taxonomy of sports and events supported by the PitchSide engine.**