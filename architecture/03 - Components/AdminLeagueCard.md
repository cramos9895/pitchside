# 🧩 AdminLeagueCard

**Type:** #component **Location:** `src/components/admin/AdminLeagueCard.tsx`

## 📥 Props Received

- **game** (Game object): The primary data structure containing the league's `title`, `start_time`, `max_players`, and `game_format`.
- **onEdit** (function): Proxy callback to trigger the `GameForm` in Edit Mode.
- **onCancel** (function): Proxy callback to trigger the soft-deletion (Cancelled status) of the season.
- **onHardDelete** (function): Proxy callback for Master Admins to perform a full database wipe.

## 🎛️ Local State & UI Logic

- **Seasonal Branding**:
    - Employs a `blue-600` theme with a subtle `bg-gradient-to-r` top-border glow to distinguish Leagues from Pickup (Green) and Tournament (Red) events.
- **Status Health Indicator**:
    - Features a persistent vertical left-side bar that shifts colors based on the season's lifecycle:
        - **Yellow**: "Season Live" (Matches are currently being played).
        - **Green**: "Season Finished" (Final standings are locked).
        - **Red**: "Cancelled" (Soft-deleted league).
- **Scale Visualization**:
    - Swaps individual player counts for a "Scale Hub" summary, highlighting that the league supports multiple teams, drafts, and free agents.
- **Deep-Link Command Center**:
    - The primary CTA ("Manage League") deep-links to `/admin/games/[id]`, which serves as the specialized management portal for standings, results, and team assignments.
- **Visual Filters**:
    - Automatically applies a `grayscale` filter to the entire card if the league is marked as "Cancelled," providing an immediate visual scan for active vs. inactive seasons.

## 🔗 Used In (Parent Pages)

- `src/components/admin/AdminGameList.tsx` (The primary administrative feed controller)

## ⚡ Actions & API Triggers

- **`Link` to `/admin/games/[id]`**: Navigates to the `AdminLeagueControl` or `MatchManager` depending on the state of the league.
- **`onHardDelete`**: For Master Admins only, providing a database-level purge of the record.

---

**AdminLeagueCard is the platform's primary unit for seasonal management, designed to provide facility owners with a high-level overview of multi-week competition logistics.**