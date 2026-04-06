# 🧩 LiveCalendarLoader

**Type:** #component **Location:** `src/components/admin/LiveCalendarLoader.tsx`

## 📥 Props Received

- **facilities** (array of [[facility]]): A list of all venues registered on the platform, used to populate the switcher.

## 🎛️ Local State & UI Logic

- **`selectedFacilityId`**: The central state driving the current viewport. Selecting a new facility immediately swaps the data context for the entire calendar.
- **`isMasterView`**: A critical boolean flag passed to the underlying `FacilityCalendar`. This enables "God Mode" permissions, allowing the master admin to see internal facility bookings and override standard schedule constraints.
- **Live Pulse Indicator**: A CSS-animated pulse (`animate-pulse`) paired with a text label that visually confirms the active connection to the facility's live booking stream.
- **Dynamic Context Header**: Renders the city and state of the selected venue alongside its name to provide geographical context for platform-wide monitoring.

## 🔗 Used In (Parent Pages)

- `src/app/admin/(dashboard)/page.tsx` (The primary Admin "God Console")

## ⚡ Actions & API Triggers

- **[[FacilityCalendar]] Integration**:
    - Passing a new `key` based on `selectedFacilityId` to force-remount the calendar whenever the target venue changes.
    - Cascading the `initialFacilityId` down to trigger the calendar's internal fetching logic for that specific venue's bookings.

---

**LiveCalendarLoader is the "Command Center" for the platform's logistics, providing a non-siloed view of all partner venue schedules within a single interface.**