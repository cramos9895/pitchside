# 🧩 ManageLeagueTabs

**Type:** #component **Location:** `src/components/facility/ManageLeagueTabs.tsx`

## 📥 Props Received

- **league** (any): The core league configuration, specifically used to retrieve the list of participating teams.
- **matches** (array of [[MatchData]]): All generated matchups for the season, including scores and status.

## 🎛️ Local State & UI Logic

- **Real-Time Standings Engine**:
    - Uses `useMemo` to procedurally calculate the entire league table from the raw `matches` array every time a score is updated.
    - Implements standard sports tie-breaking logic: **Points > GD > GF**.
- **Results Entry Workflow**:
    - **Weekly Sidebar**: A vertical navigation rail that allows admins to toggle between "Game Weeks" to focus on active matchups.
    - **Score Locking**: Matches marked as `completed` are visually and functionally locked, disabling input fields to prevent accidental post-game tampering.
- **Dashboard Feed**:
    - **Upcoming Analytics**: Automatically filters and displays the next 5 pending games across the entire season for immediate administrative oversight.
    - **Completion Progress**: A "Facility Overview" panel provides a status bar of total vs. completed matches.

## 🔗 Used In (Parent Pages)

- `src/app/facility/admin/leagues/[id]/manage/page.tsx`
- `src/app/admin/(dashboard)/leagues/[id]/live/page.tsx`

## ⚡ Actions & API Triggers

- **[[submitMatchScore]]**: A server action that handles individual match result submissions, updating the database and triggering a Next.js revalidation.
- **`useFormStatus`**: Utilized within the `SubmitScoreButton` sub-component to provide immediate "Saving..." feedback directly in the match card.
- **Dynamic Derivation**: Relies on `useMemo` for heavy calculations (Standings) to ensure a smooth UI experience during rapid data entry.

---

**ManageLeagueTabs serves as the day-to-day coordination hub for league administrators, combining data entry, automated table calculations, and schedule monitoring into a single synchronized interface.**