# ⚙️ admin-marketplace

**Type:** #api #database #governance  
**Location:** `src/app/actions/admin-marketplace.ts`

## 📄 Expected Payload / Schema

- **claimMarketplaceSlot**: `formData` (`facility_id`, `resource_id`, `start_time`, `end_time`).

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Master Admin Lockdown**: This action contains a strict role-gate. It verifies the authenticated user has either `system_role: 'super_admin'` or `role: 'master_admin'`. Non-HQ users are explicitly forbidden from "claiming" marketplace slots.
- **Collision Auditing**: Utilizes `createAdminClient()` to bypass standard participant RLS. This is critical for performing a final sub-second boundary check against the facility's entire `resource_bookings` ledger before committing a claim.

## 🧪 Business Logic & Math

- **The "Network Slot" Strategy**:
    - This is the platform's primary **B2B Logic Hub**. It allows PitchSide HQ to centrally manage and request blocks of time from physical venues to host "PitchSide Network" events.
- **Staging & Approval**:
    - Claims are automatically injected with `status: 'pending_facility_review'`. This ensures that while HQ can request the time, the facility host maintains ultimate physical sovereignty over their pitch.
- **Visual Distinction (Volt Coding)**:
    - Automatically assigns the color **`#ccff00`** (PitchSide Accent Volt Green) to the database record. This ensures that on the facility's internal calendar view, HQ-owned sessions are instantly distinguishable from local pickup games or private rentals.
- **Time Logic Protection**:
    - Implements a server-side "End > Start" validation to prevent corrupting the facility's calendar with negative or zero-duration blocks.

## 🔄 Returns / Side Effects

- **Returns**: Standardized response `{ success: true }` or a descriptive error (e.g., "Forbidden" or "Conflict Detected").
- **Notification Pipeline**: Dispatches an in-app `booking_request` alert directly to all `facility_admin` profiles associated with the target venue.
- **UI Synchronization**: Triggers `revalidatePath` for `/admin/marketplace` and `/facility`, instantly updating the global slot availability for HQ and the internal schedule for the venue host.

---

**`admin-marketplace` is the platform's "Network Infrastructure Bridge," mathematically enabling PitchSide HQ to request and manage physical inventory across a distributed facility ecosystem.**