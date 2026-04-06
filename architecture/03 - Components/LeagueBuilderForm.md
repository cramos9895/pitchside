# 🧩 LeagueBuilderForm

**Type:** #component **Location:** `src/components/facility/LeagueBuilderForm.tsx`

## 📥 Props Received

- **activityTypes** (array): Global sport definitions (Soccer, Basketball, etc.) used to categorize the league.
- **resources** (array): The facility's physical assets (Field 1, Court B) available for scheduling.
- **action** (function): The Server Action that handles the multi-table transaction for league initialization or updates.
- **initialData** (object, optional): Existing league metadata used to dehydrate the form into "Edit Mode."

## 🎛️ Local State & UI Logic

- **Interactive Season Blueprint**:
    - This is the component's marquee feature. As the user adjusts dates and playoff settings, a real-time engine calculates the **Total Season Velocity**:
        1. **Temporal Math**: Translates `startDate` and `endDate` into a total week count.
        2. **Playoff Distribution**: Automatically subtracts weeks from the regular season to accommodate the selected playoff bracket size (e.g., an 8-team playoff requires a 3-week "tax" on the end of the season).
        3. **Visual Mockup**: Renders a scrollable timeline of every game week, color-coded by "Regular Season" (Green) and "Playoff Rounds" (Pitch Accent).
- **Dynamic Resource Multiplexer**:
    - Provides a tactile toggle-grid for assigning multiple physical fields or courts to a single league. It handles the serialization of these IDs into a `league_resources` junction table via the main form `action`.
- **Temporal Boundary Controls**:
    - Beyond simple dates, it manages the facility's **operational window** for the league (e.g., "Games only occur between 6:00 PM and 10:00 PM"), providing bounds for the automated schedule generator.
- **Transactional Guardrails ("Danger Zone")**:
    - In Edit Mode, it exposes high-stakes administrative actions:
        - **Cancel League**: A "Soft-Lock" that preserves statistics but prevents further scheduling or entry.
        - **Destroy League**: A "Hard-Wipe" that purges all matchups, standings, and registration records. Both are protected by individual, high-friction confirmation modals to prevent accidental data loss.

## 🔗 Used In (Parent Pages)

- `src/app/facility/leagues/create/page.tsx`
- `src/app/facility/leagues/[id]/edit/page.tsx`

## ⚡ Actions & API Triggers

- **`action(formData)`**: Dispatches the entire league configuration to the server for processing.
- **[[cancelLeague]]** / **[[deleteLeague]]**: Direct administrative server actions for lifecycle management.

---

**LeagueBuilderForm is the platform's most complex configuration tool, designed to transform abstract dates and rules into a functional, predictable season blueprint through real-time visualization.**