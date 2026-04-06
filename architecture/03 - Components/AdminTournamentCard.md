# 🧩 AdminTournamentCard

**Type:** #component **Location:** `src/components/admin/AdminTournamentCard.tsx`

## 📥 Props Received

- **game** (Game object): The primary data structure containing the tournament's `title`, `start_time`, `tournament_style`, and `prize_type`.
- **onEdit** (function): Proxy callback to trigger the `GameForm` in Edit Mode.
- **onCancel** (function): Proxy callback to trigger the soft-deletion (Cancelled status) of the tournament.
- **onHardDelete** (function): Proxy callback for Master Admins to perform a full database wipe.

## 🎛️ Local State & UI Logic

- **Competitive Aesthetic Overhaul**:
    - Employs a `red-600` theme with a `bg-gradient-to-br` glossy overlay to distinguish high-stakes Tournaments from Pickup (Green) and League (Blue) events.
- **Prize Serialization HUD**:
    - Implements a `getPrizeDisplay()` helper that dynamically normalizes the display of various reward archetypes:
        - **Fixed Cash Bounty**: Renders with a currency symbol (`$500`).
        - **Physical Item**: Displays the custom `reward` text or a "Physical Trophy" fallback.
        - **Bragging Rights**: Default fallback for low-stakes matches.
- **Bracket Structure Metrics**:
    - Swaps individual player counts for **Team Slots** (`current_teams / max_teams`), reflecting the competitive architecture.
    - Automatically cleans the `tournament_style` string (e.g., `single_elimination` -> "Single Elimination") for the sub-label.
- **Status Health Indicator**:
    - Features a persistent vertical left-side bar that shifts colors based on the tournament's lifecycle:
        - **Yellow**: "In Progress" (Matches are currently being tracked).
        - **Green**: "Finished" (Winner has been crowned).
        - **Red**: "Cancelled" (Soft-deleted tournament).
- **Interactive Hover Depth**:
    - Includes a state-aware "Manage Tournament" CTA that uses a `text-shadow-glow` and high-contrast styling to position it as a primary administrative hub.

## 🔗 Used In (Parent Pages)

- `src/components/admin/AdminGameList.tsx` (The primary administrative feed controller)

## ⚡ Actions & API Triggers

- **`Link` to `/admin/games/${game.id}`**: Navigates to the `PlayerCommandCenter` or `MatchManager` portal for bracket management.
- **`onHardDelete`**: For Master Admin only, providing a database-level purge of the record.

---

**AdminTournamentCard is the platform's primary unit for high-stakes competition management, designed to provide facility owners with a clear view of prize distribution and team scaling.**