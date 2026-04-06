# 🧩 LeagueCard

**Type:** #component **Location:** `src/components/public/LeagueCard.tsx`

## 📥 Props Received

- **league** (object): The parent competition data, featuring unique league-specific fields like `roster_lock_date` and `regular_season_start`.
- **userId** (string, optional): Used to cross-reference against the `registrations` array.
- **registrations** (array, optional): Historical participants used to determine the viewer's active role.

## 🎛️ Local State & UI Logic

- **Data Property Harmonization**:
    - Implements a normalization layer that resolves naming conflicts between different database versions (e.g., `price` vs `team_price` and `start_date` vs `start_time`). This ensures visual stability even if the underlying API response fluctuates.
- **Extended Timeline Focus**:
    - Unlike standard event cards, this component highlights **Multi-Step Logistics**:
        1. **Kickoff**: The first day of the regular season.
        2. **Playoffs**: The projected start of the elimination phase.
        3. **Roster Lock**: The final deadline for captains to finalize their squad lists.
- **Differentiated Visual Identity**:
    - Features a vertical "Identity Bar" (`pitch-accent` left-border) and a specialized **"Multi-Week League"** pill badge to signify the long-term commitment required for the event.
- **Role-Based Interaction Grid**:
    - Inherits the high-performance action logic from `TournamentCard`, dynamically swapping between **"Captain's Command Center"**, **"Player Dashboard"**, and **"Register"** paths based on the `userId`'s current standing in the league.

## 🔗 Used In (Parent Pages)

- `src/app/leagues/page.tsx` (Global League Discovery Feed)
- `src/app/page.tsx` (Home Page "Active Seasons" section)

## ⚡ Actions & API Triggers

- **`router.push()`**: Routes users into the appropriate registration/management lifecycle based on their inferred role.

---

**LeagueCard is the architectural cousin to TournamentCard, optimized to convey the complexity of multi-week competitive seasons through a scannable, logistics-first interface.**