# 🧩 PublicFacilityCalendar

**Type:** #component **Location:** `src/components/public/PublicFacilityCalendar.tsx`

## 📥 Props Received

- **facilityId** (string): The ID of the venue whose schedule is being viewed.
- **isAuthenticated** (boolean): Passed to the booking modal to determine if the user needs to log in before checking out.

## 🎛️ Local State & UI Logic

- **Real-Time Availability Pulse**:
    - Uses Supabase Realtime to subscribe to the `resource_bookings` table. If another user or facility admin confirms a booking, the slot instantly turns "Unavailable" on the public calendar without a page refresh.
- **Strict Privacy Anonymity**:
    - While fetching global bookings, the component intentionally overwrites all event titles to **"Unavailable"** or **"Booked"**. This prevents the public from seeing private renter names or internal event details.
- **Interactive Slot Selection**:
    - Employs `onSelectSlot` to allow users to click-and-drag or tap on empty calendar regions. This captures the `start`, `end`, and `resourceId` to pre-fill the rental application.
- **"Scorched Earth" CSS Theming**:
    - Injects global style overrides to transform the standard `react-big-calendar` into a premium dark-mode interface with `pitch-accent` highlights and consistent `rbc-time-slot` alignment.
- **Resource Swapping**:
    - Dynamically maps facility resources (fields/courts) to the calendar's `resources` prop, allowing multi-pitch venues to display side-by-side availability in `Views.DAY`.

## 🔗 Used In (Parent Pages)

- `src/app/facilities/[id]/page.tsx` (Public Venue Landing Page)

## ⚡ Actions & API Triggers

- **Supabase `.on('postgres_changes')`**: Maintains a live socket connection to ensure data-integrity between the public view and the administrative reality.
- **[[PublicBookingModal]]**: The primary conversion point; this modal is triggered once a valid time slot is selected.
- **[[CalendarToolbar]]**: A reused navigation component for consistent date-switching logic.

---

**PublicFacilityCalendar is the platform's primary consumer-facing inventory display, providing high-fidelity, real-time availability for venue rentals.**