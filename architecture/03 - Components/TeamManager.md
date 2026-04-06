# 🧩 TeamManager

**Type:** #component **Location:** `src/components/admin/TeamManager.tsx`

## 📥 Props Received

- **gameId** (string): The UUID of the parent event.
- **players** (array): The raw list of all bookings for the event, including payment status and assignment.
- **teams** (array): The configuration array defining team names, colors, and roster limits.
- **onUpdate** (function): Callback to refresh the parent data state after re-assignments.

## 🎛️ Local State & UI Logic

- **Visual Design System Tokens**:
    - Implements a sophisticated three-layer mapping system (`COLOR_MAP`, `HEX_COLOR_MAP`, `TEXT_COLOR_MAP`) to ensure that branded colors like "Neon Green" or "Neon Blue" are rendered with consistent glow effects, border logic, and typography across the dashboard.
- **Heuristic Management Tools**:
    - **`handleRandomize` (The "Nuclear" Shuffle)**: Triggers a comprehensive server-side reshuffle via the `/api/games/teams` endpoint. This wipes all manual assignments and redistributes the entire active population.
    - **`handleAutoFill` (The "Greedy" Fill)**: A client-side optimization tool that localizes unassigned players and populates them into the first available team slots until limits are reached, preserving existing team structures.
- **Financial Status HUD**:
    - Each player row in the team columns is decorated with a status indicator dot (`verified`: Green, `pending`: Yellow, `unpaid`: Red). This allows admins to perform a "financial audit" of a team's roster without navigating away from the management view.
- **Density Visualization**:
    - Individual team columns feature an absolute-positioned progress bar at the header, providing an immediate heat-map of which teams are "Full" (100%) vs. "Recruiting."
- **Eligibility Filter**:
    - The component strictly filters the input list to only show **Active/Paid** players. Waitlisted or non-financial participants are automatically hidden from the assignment UI to ensure roster integrity.

## 🔗 Used In (Parent Pages)

- `src/components/admin/AdminLeagueControl.tsx`
- `src/components/admin/MatchManager.tsx` (In pre-match view)

## ⚡ Actions & API Triggers

- **`/api/games/teams` (POST)**: External API call for secure, server-side randomization.
- **`supabase.from('bookings').update()`**: Performs batch updates of `team_assignment` strings when using the Auto-Fill tool.

---

**TeamManager is the platform's primary interface for roster balancing, designed to provide facility owners with high-friction manual control and low-friction algorithmic automation.**