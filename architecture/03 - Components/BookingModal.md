# 🧩 BookingModal (Facility)

**Type:** #component **Location:** `src/components/facility/BookingModal.tsx`

## 📥 Props Received

- **isOpen / onClose**: Standard modal visibility controls.
- **selectedSlot**: Metadata for the "New Booking" path (Start/End times + Resource ID).
- **selectedEvent**: The existing `BookingEvent` object for the "Manage/Edit" path.
- **resources**: The list of available facility resources for the dropdown selector.
- **existingBookings**: The cache of current calendar events used to power the **Smart Conflict Skipper**.
- **onSuccess**: Callback to refresh the calendar view after a successful transaction.

## 🎛️ Local State & UI Logic

- **Operational Dual-Mode Architecture**:
    - The modal dynamically toggles between a **View Mode** (Details/Roster) and an **Edit Mode** (Form). This allows staff to quickly check-in players or review notes without accidentally modifying the schedule.
- **Smart Conflict Skipper (SCS)**:
    - Before submitting a recurring series, the component executes a client-side collision check against the `existingBookings` array.
    - If overlaps are detected, it halts the save process and renders an **Overlapping Dates Registry**, showing exactly which slots are blocked.
    - It then transitions the primary CTA to **"Book Remaining [N]"**, allowing the admin to skip conflicts and secure the valid dates in a single batch transaction.
- **Contract & Invoice Workflow**:
    - For external "Pending Contract" requests, the modal injects a specialized financial layer.
    - Staff can set the final negotiated **Contract Price** and choose **Payment Terms** (Upfront vs. Weekly Auto-Pay) before triggering the `approveContract` action, which notifies the user and saves their card on file.
- **Internal Roster Monitor**:
    - Includes a dedicated `roster` tab that pulls live data from the `booking_rosters` table.
    - It highlights **Verified Players** (those who have signed waivers and linked their IDs), providing facility staff with a high-trust attendance list for risk management.
- **Recursive Deletion Controller**:
    - For recurring bookings, it provides a contextual "Delete" menu with two distinct paths: **"Just This"** (deletes the single instance) or **"Series"** (wipes the entire group by `recurringGroupId`).

## 🔗 Used In (Parent Pages)

- `src/components/facility/FacilityCalendar.tsx` (The primary operational heat-map for the facility)

## ⚡ Actions & API Triggers

- **`createRecurringBooking` / `createBooking`**: Primary creation hooks.
- **`cancelBooking`**: Triggers a soft-deletion and initiates the synchronous refund process via Stripe.
- **`approveContract`**: Bridges the negotiation-to-live-event gap by setting price and payment rules.

---

**BookingModal is the "Tactical Hub" of facility management, combining schedule editing, financial negotiation, and player compliance into a single, high-security operational interface.**