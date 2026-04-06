# ⚙️ facility

**Type:** #api #database #administration **Location:** `src/app/actions/facility.ts`

## 📄 Expected Payload / Schema

- **Resources**: `formData` (Name, Type, Default Rate, Activity IDs).
- **Calendar**: `formData` (Title, Start/End Time, Renter Name, Price, Resource ID).
- **Leagues**: `formData` (Standard league configuration fields + Resource IDs).
- **Contracts**: `bookingId`, `finalPriceCents`, `paymentTerm` ('upfront' | 'weekly').

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Administrative Lock**: Strictly enforces that the caller has a profile role of `facility_admin`, `admin`, or `master_admin`.
- **Multi-Tenant Isolation**: Except for Super Admins, the action verifies that the `targetFacilityId` matches the `profile.facility_id`, preventing host-to-host data manipulation.
- **Bypass**: Utilizes `createAdminClient()` (Service Role) for bulk operations and junction table maintenance (e.g., `resource_activities`) that would be restricted by standard user-level RLS.

## 🧪 Business Logic & Math

- **The "Collision Detection" Engine**:
    - Prior to any booking insertion (`createBooking` or `createRecurringBooking`), the API executes a boundary check: `start_time < proposed_end_time AND end_time > proposed_start_time`. This prevents overlapping reservations on the same physical resource.
- **Batch Recurring Reservation Logic**:
    - `createRecurringBooking` accepts a JSON payload of target dates.
    - It executes a single, massive **OR query** to check for conflicts across the entire series.
    - On success, it creates a unique `recurring_group_id` to link the series for bulk management.
- **Financial Integration (Refund Bridge)**:
    - `cancelBooking` includes a native hook into `refundPayment()`. It only proceeds to mark the booking as `status: 'cancelled'` and `payment_status: 'refunded'` if the Stripe refund is confirmed, maintaining financial integrity.
- **The "God Action" Lifecycle**:
    - Oversees the entire facility hierarchy: **Facility ➔ Resources ➔ Activities ➔ Bookings/Leagues**.
    - `approveContract` injects financial terms into `recurring_booking_groups` and triggers the `ContractApprovedEmail` pipeline.

## 🔄 Returns / Side Effects

- **Returns**: Standardized response `{ success: boolean, error?: string, publicUrl?: string }`.
- **System-Wide Revalidation**: Triggers `revalidatePath` across the entire Administrative and Public Facility routing:
    - `/facility/calendar`, `/facility/resources`, `/facility/settings`.
    - `/facility/[slug]`: For the public-facing venue page.
    - `/facilities`: For the global marketplace index.
- **Transactional Notifications**: Manages `contract_ready` and `booking_cancellation` email dispatches.

---

**`facility` is the platform's "Command & Control" engine, mathematically managing physical space, financial contracts, and operational logistics for venue owners.**