# ⚙️ facility-team

**Type:** #api #database #identity  
**Location:** `src/app/actions/facility-team.ts`

## 📄 Expected Payload / Schema

- **inviteFacilityStaff**: `email` (String) of the target team member.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Authorization Gate**: Restricted to `super_admin`, `master_admin`, or an existing `facility_admin`. This ensures that only high-authority users or existing facility leads can expand their staff roster.
- **Impersonation Context**: Supports the **"God-Mode"** workflow. If a Super Admin is currently auditing a venue, the action reads the `pitchside_impersonate_facility_id` cookie to ensure the invitation is correctly bound to the audited facility rather than the admin's own profile.
- **Admin Auth Bridge**: Utilizes `createAdminClient()` and `auth.admin.inviteUserByEmail`. This bypasses standard public sign-up restrictions, allowing the platform to generate a system-level account link directly.

## 🧪 Business Logic & Math

- **The "User Re-Linking" Logic**:
    - This is the platform's primary **Account Reconciliation** strategy.
    - If the invited email already exists in the system (e.g., as a player), the action catches the `422` error and instead executes a profile update. It "promotes" the existing user by linking their `facility_id` and elevating their `system_role` to `facility_admin`.
- **Trigger Synchronization**:
    - Implements a strategic **500ms delay** after the auth invitation. This provides enough temporal space for the backend PostgreSQL trigger to finish creating the new `profiles` row before the action attempts to update its reference fields.
- **Waiver & Approval Bypass**:
    - Automatically sets `verification_status: 'verified'`. This ensures that invited staff members are "Pre-Approved" and can access the Facility Portal immediately without waiting in the standard global administrative queue.

## 🔄 Returns / Side Effects

- **Returns**: Standardized response `{ success: true, message: string }` with context on whether a new invite was sent or an existing user was linked.
- **UI Synchronization**: Triggers `revalidatePath` for `/facility/settings/team`, ensuring the staff management dashboard reflects the new addition instantly.

---

**`facility-team` is the platform's "Access Authority," providing the surgical logic needed to manage administrative permissions and venue-specific staff rosters across a shared global identity pool.**