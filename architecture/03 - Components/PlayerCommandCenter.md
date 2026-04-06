# 🧩 PlayerCommandCenter

**Type:** #component **Location:** `src/components/public/PlayerCommandCenter.tsx`

## 📥 Props Received

- **user** (object): The authenticated user's profile data.
- **registration** (object): The specific tournament entry record, linking the user to a team.
- **game** (object): The parent tournament/league event configuration.
- **roster** (array): The full list of players assigned to the same team.
- **matches** (array): The complete set of matches for the competition.

## 🎛️ Local State & UI Logic

- **Adaptive Participant UI**:
    - **Draft Pool Mode**: If unassigned (`team_id` is null), the component renders a specialized "Waiting Room" dashboard to educate Free Agents on the drafting process.
    - **Command Center Mode**: Once rostered, it unlocks a multi-tab workspace (Standings, Schedule, Rules, Chat).
- **Financial "Split Pay" Intelligence**:
    - Dynamically calculates the player's personal share of the `team_price` based on the current `roster.length`.
    - Predicts and displays the automated **Stripe Charge Date** (24 hours prior to the event).
- **Match Focus Engine**:
    - Filters the global tournament schedule to prioritize the user's specific team matchups.
    - Renders an oversized **"Next Match"** card featuring countdown details and field assignments.
- **Isolated Team Communication**:
    - Integrates the `ChatInterface` but restricts scope to the user's `team_id`, ensuring a secure, private channel for team tactics and coordination.
- **Venue Integration**:
    - Provides a "Deep Link" to Google Maps using the facility's physical address for one-touch navigation.

## 🔗 Used In (Parent Pages)

- `src/app/tournaments/[id]/workspace/page.tsx`
- `src/app/leagues/[id]/workspace/page.tsx`

## ⚡ Actions & API Triggers

- **[[leaveTournament]]**: A critical server action that processes the user's withdrawal, handles RLS cleanup, and notifies the tournament organizer.
- **[[StandingsTable]]**: Reuses the core league calculation logic in a `viewOnly` mode to maintain cross-platform data consistency.
- **[[ChatInterface]]**: Manages real-time socket/Supabase connections for the team-specific messaging thread.

---

**PlayerCommandCenter is the primary "Home Base" for players during multi-week events, consolidating logistics, finances, and communications into a single mobile-optimized portal.**