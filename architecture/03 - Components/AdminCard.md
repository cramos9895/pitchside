# 🧩 Admin Card Suite

**Type:** #component-suite **Location:** `src/components/admin/Admin[Type]Card.tsx`

The Admin Card suite consists of three polymorphic units: **AdminPickupCard**, **AdminTournamentCard**, and **AdminLeagueCard**. These are the high-utility operational versions of the public-facing game cards, optimized for rapid facility management.

## 🧱 Shared Core Architecture

- **Operational Proxy Pattern**:
    - All cards receive the same standard set of control props: `onEdit`, `onCancel`, and `onHardDelete`.
    - This allows for bulk management of events from a centralized feed while ensuring that destructive database actions are confirmed at the parent component level.
- **Status-Driven Visual Filters**:
    - **Cancelled State**: Automatically applies `grayscale` and `opacity-60` to the card, visually de-emphasizing it in the feed.
    - **Health Bar Indicator**: A persistent 1px vertical bar on the left edge provides a "glanceable" status report:
        - **Yellow**: Live / In-Progress
        - **Green**: Completed / Finished
        - **Red**: Cancelled or Refund Pending
- **Deep-Link Management**:
    - Each card includes a primary CTA link to `/admin/games/[id]`, which serves as the "Command Center" for that specific event's roster and scoring.

## 🎨 specialized Variant Logic

### 🟢 [[AdminPickupCard]]

- **Duration Engine**: Dynamically calculates the `durationStr` (e.g., "1h 30m") by parsing the `end_time` string—which may be a full ISO date or a simple "HH:mm" timestamp—against the `start_time`.
- **Financial Liability Flag**: If a pickup game is cancelled but `refund_processed` is false, the card adds a high-contrast `bg-red-500` "Refund Needed" badge and switches the primary action to "Process Refund."

### 🔴 [[AdminTournamentCard]]

- **Prize Serialization**: Includes a `getPrizeDisplay()` helper that normalizes the display of various reward archetypes (Fixed Cash Bounty, Physical Item, or Generic Bragging Rights).
- **Structure Visualization**: Swaps standard roster counts for **Team Slots** (`current_teams / max_teams`), reflecting the bracket-based nature of the event.

### 🔵 [[AdminLeagueCard]]

- **Seasonal Context**: Emphasizes the start/end boundaries of the season rather than a single match-time, and highlights the registration state (e.g., "Draft & Free Agents" mode).

## ⚡ Actions & API Triggers

- **`onEdit`**: Opens the `GameForm` modal populated with the card's data.
- **`onCancel`**: Triggers the `cancelGame` server action (soft-delete).
- **`onHardDelete`**: Triggers a full database purge for the specific event record (Master Admin only).

---

**The Admin Card suite is the platform's primary logistics unit, providing facility owners with a high-density, action-oriented view of their event operations.**