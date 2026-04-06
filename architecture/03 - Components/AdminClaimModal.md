# 🧩 AdminClaimModal

**Type:** #component **Location:** `src/components/admin/AdminClaimModal.tsx`

## 📥 Props Received

- **selectedSlot** (object): Contains the `start` and `end` Date objects, plus the `resourceId` (Field/Court ID) being claimed.
- **facilityName / facilityId** (strings): Metadata for the venue where the time is being reserved.
- **resources** (array): The list of available assets at the facility, used to lookup the specific title (e.g., "Field 3") of the selected slot.
- **onSuccess** (function): Callback to refresh the parent calendar after a successful claim.

## 🎛️ Local State & UI Logic

- **Exclusive Marketplace Reservation**:
    - This is the primary tool for **Master Admins** to manually "Claim" inventory from a partner facility's schedule. Once confirmed, this time slot is officially reserved for PitchSide and removed from the facility's public availability.
- **Tiered Booking Selection**:
    - Implements a `bookingType` state that allows admins to define the operational nature of the claim:
        - **Contract Claim (Confirmed)**: Used for block-time already purchased under a facility contract. It bypasses approval workflows for instant booking.
        - **Ad-Hoc Request (Pending)**: Submits a placeholder that the facility manager must manually approve via their own dashboard.
- **Contextual Summary HUD**:
    - Features a high-contrast `bg-black/40` summary card that uses `date-fns` to format the proposed `Date` and `Time Range`. This acts as the final "Zero-Error" validation step before committing the database transaction.
- **Visual Feedback Loop**:
    - Employs an `animate-pulse` error state for server-side conflicts (e.g., slot already taken) and an `opacity-50` blocking state on the `Confirm PitchSide Booking` button during execution.

## 🔗 Used In (Parent Pages)

- `src/components/admin/LiveCalendarLoader.tsx` (Triggered by clicking empty slots on a facility schedule)

## ⚡ Actions & API Triggers

- **[[claimMarketplaceSlot]]**: The Server Action responsible for inserting the reservation into the `bookings` table with an `admin_claim` or `contract` status.

---

**AdminClaimModal is the platform's inventory control gateway, allowing Master Admins to securely bridges the gap between negotiated facility contracts and live digital marketplace availability.**