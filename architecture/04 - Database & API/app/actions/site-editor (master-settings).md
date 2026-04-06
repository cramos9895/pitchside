# ⚙️ site-editor (master-settings)

**Type:** #api #database #cms **Location:** `src/app/actions/master-settings.ts`

## 📄 Expected Payload / Schema

- **Global Resource Types**: `formData` (Name, Description).
- **Global Activity Types**: `formData` (Name, Color Code).
- **Action Context**: Triggered from the Super-Admin Settings dashboard to define platform-wide building blocks.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **The "Final Authority" Lock**: Strictly restricts execution to profiles where `role === 'master_admin'` or `system_role === 'super_admin'`. Facility-level admins and standard users are blocked with an "Unauthorized" error.
- **Bypass**: Employs `createAdminClient()` (Service Role) to modify global lookup tables (`resource_types`, `activity_types`) that are typically read-only for standard authenticated sessions.

## 🧪 Business Logic & Math

- **Global Taxonomy Management**:
    - This action manages the **Marketplace Building Blocks**. Instead of facilities creating their own arbitrary sport types, they must choose from the global registry managed here. This ensures system-wide data consistency for filtering and SEO.
- **Conflict & Integrity Logic**:
    - **Unique Constraint Enforcement**: Specifically listens for Postgres error code **`23505`** (Unique Violation). If a super-admin tries to create "Soccer" when it already exists, the action returns a graceful user-facing error rather than a 500 crash.
    - **Cascading Constraints**: The `delete` operations are naturally guarded by foreign key relationships. If a resource type is currently assigned to 50 active fields, the database will reject the deletion, and the action returns a "Safe Delete" error to the admin.
- **Visual Metadata**:
    - Manages the `color_code` for activity types, which is used platform-wide to color-code calendar events and map markers.

## 🔄 Returns / Side Effects

- **Returns**: Standardized response `{ success: true }` or `{ error: string }`.
- **Global Cache Invalidation**: Triggers `revalidatePath` for:
    - `/admin/settings/resources`: Refreshing the global resource registry.
    - `/admin/settings/activities`: Updating the sports taxonomy list.
- **Wider Impact**: Any changes here immediately propagate to the "Activity Picker" in the facility onboarding flow and the "Filter by Sport" component on the public marketplace.

---

**`site-editor` (master-settings) is the platform's "Taxonomy Authority," mathematically enforcing a consistent organizational structure across every facility and event in the ecosystem.**