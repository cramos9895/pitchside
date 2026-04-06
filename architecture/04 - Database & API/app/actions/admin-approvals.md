# ⚙️ admin-approvals

**Type:** #api #database #governance  
**Location:** `src/app/actions/admin-approvals.ts`

## 📄 Expected Payload / Schema

- **approveUser**: `userId` (UUID).
- **denyUser**: `userId` (UUID).
- **Action Context**: Triggered from the Master Admin Dashboard in response to new user signups or facility host applications.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **The "Master Admin" Lock**: Strictly enforces that the caller holds the `master_admin` role or `super_admin` system role. Unlike standard facility actions, these functions can modify the global `profiles` table across all tenants, so standard facility-level admins are explicitly blocked.
- **Verification Integrity**: Directly manipulates the `verification_status` column in the `profiles` table. This column acts as a platform-wide "Seal of Approval," often used as a requirement for creating games or accessing the Connect onboarding flow.

## 🧪 Business Logic & Math

- **Identity Lifecycle Management**:
    - **Promotion Path**: `approveUser` transitions a profile from `pending` to `verified`. In a production environment with KYC (Know Your Customer) requirements, this action would be the final step after reviewing uploaded ID documents.
    - **Rejection Path**: `denyUser` sets the status to `rejected`. This effectively flags the account, which can be used to prevent the user from performing high-privilege actions without a manual support appeal.
- **Atomic State Transitions**:
    - The action performs a singular, targeted update to the `profiles` table. By using `verification_status` as a state machine variable, the platform can implement granular access control (e.g., "Only verified users can book fields over $500").

## 🔄 Returns / Side Effects

- **Returns**: Throws a descriptive error on failure; returns nothing (void) on success as it relies on revalidation.
- **Targeted Cache Invalidation**: Triggers `revalidatePath` for:
    - `/admin/requests`: The primary "To-Do" queue for platform owners.
    - `/admin/users`: The global directory, ensuring the status badge updates from "Pending" to "Verified" instantly for the admin.

---

**`admin-approvals` is the platform's "Trust Authority," providing the administrative steering logic needed to verify identities and maintain the integrity of the PitchSide ecosystem.**