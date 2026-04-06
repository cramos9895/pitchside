# 🧩 AdminLeagueControl

**Type:** #component **Location:** `src/components/admin/AdminLeagueControl.tsx`

## 📥 Props Received

- **leagueId** (string): The unique identifier for the current league/season.
- **registrations** (array of [[Registration]]): Flattened list of all players, including their team assignments and payment metadata.
- **matches** (array): The current set of scheduled or completed matches.
- **teams** (array): The list of distinct team entities participating in the league.
- **rosterFreezeDate** (string | null): The ISO timestamp after which player transfers and new sign-ups are restricted.

## 🎛️ Local State & UI Logic

- **Stripe "Lock & Charge" Engine**: A high-impact administrative action that triggers off-session payment processing for all registrations in the `card_saved` state.
- **Intelligent Roster Grouping**:
    - Dynamically reduces the flat `registrations` array into team-based clusters.
    - Segregates unassigned players into a **"Free Agent Waiting Room"** for manual administrative placement.
- **Schedule Management**:
    - **Automated Generator**: Provides a one-click round-robin schedule creator that accounts for venue availability.
    - **Inline Rescheduling**: A dedicated modal-driven workflow for adjusting match times with system-level conflict verification.
- **Playoff Transition Logic**: Monitors match completion density to enable the `Seed Playoffs` action, which automatically builds the knockout bracket based on final standings.
- **Accordion Navigation**: Uses `expandedTeams` state to manage screen real estate, allowing admins to drill down into specific rosters without losing context of the overall league.

## 🔗 Used In (Parent Pages)

- `src/app/admin/(dashboard)/leagues/[id]/page.tsx`

## ⚡ Actions & API Triggers

- **[[processLeaguePayments]]**: A bulk financial transaction engine that interacts with Stripe to move registrations to a `paid` state.
- **[[generateLeagueSchedule]]**: A server-side algorithm for automated match distribution.
- **[[seedPlayoffBracket]]**: A complex database transaction that calculates final regular-season standings and initiates the knockout phase.
- **[[cancelMatch]] / [[rescheduleMatch]]**: Granular controls for individual match lifecycle management.

---

**AdminLeagueControl is the command center for multi-week competition, orchestrating payments, logistics, and data-driven tournament transitions in a single interface.**