### 💳 Transactional & Payment Engine

_The primary conduits for revenue, seat reservation, and wallet management._

- **[[join]]**: The master logic for event entry (Pickup, Tournament, League).
- **[[join-with-credit]]**: Specialized high-speed entry using internal wallet balances (Zero-Stripe logic).
- **[[checkout]]**: Initializes the Stripe Hosted or Embedded checkout sessions.
- **[[intent]]**: Generates Stripe Client Secrets for on-page PCI-compliant payments.
- **[[stripe]]**: The critical "Truth Bridge" that confirms payments and updates booking statuses.
- **[[processLeaguePayments]]**: Bulk processing for season-long installments.
- **[[executeEscrowShortfalls]]**: Mathematical engine for "Host-Pays-Difference" logic in under-booked games.
- **[[stripe-payment]]**: Vaulting and manual capture of credit cards on file.

### 🏆 Competition & Match Logic

_The algorithmic core for brackets, scheduling, and live results._

- **[[matches]]**: The real-time synced endpoint for projector and tournament views.
- **[[seedTournament]]**: Algorithmic engine for transforming teams into elimination brackets.
- **[[seedPlayoffBracket]]**: Transitions group-stage winners into the knockout phase.
- **[[finalizeGame]]**: The "Match Close-Out" logic that locks scores and calculates final payouts.
- **[[team-manager]]**: Real-time roster balancing and drag-and-drop team logic.
- **[[draft-free-agent]]**: The "Waiver Wire" logic for moving players from the waitlist to a squad.
- **[[house-team]]**: The platform's "Free Agent Liquidator," providing a one-click administrative solution for converting unassigned individuals into a fully-paid competitive squad.
- **[[draft-player]]**: The platform's "Roster Construction" logic, empowering squad captains to actively build their teams from the waitlist and free agent marketplace.

### 🛡️ Player & Access Control

_Security-sensitive logic for identity and platform compliance._

- **[[leave]]**: Handles seat vacation, refund eligibility checks, and waitlist promotion.
- **[[kick]]**: Administrative removal of players from a game session.
- **[[compliance]]**: Identity verification and administrative "Seal of Approval" for players.
- **[[impersonate]]**: God-mode utility for high-level support and debugging.
- **[[profiles]]**: Global CRUD for user metadata, role assignments (Staff vs. Host), and wallet history.

### 🛰️ Facility & Site Management

_Infrastructure controls for venue owners and platform administrators._

- **[[notify]]**: The internal notification router (Email/Push/SMS triggers).
- **[[connect]]**: Onboarding for facility owners to receive marketplace payouts.
- **[[settings]]**: Global and localized feature flags (Free game credits, platform fees).
- **[[facility]]**: Resource allocation (Court/Field management) and hour-of-operation logic.
- **[[site-editor (master-settings)]]**: Content management for the public facing landing pages.
- **[[league-registration]]**: Logic for team-based entry, deposit handling, and captain assignment.
- **[[tournament-registration]]**: Similar to league logic, but handles group entry and bracket placement.
- **[[stripe-callback]]**: The critical "Return Path" for Stripe Connect, confirming facility onboarding status.
- **[[sync-counts]]**: A mission-critical utility for recalculating roster spots when transactional drift occurs (fixing "ghost" players).
- **[[admin-approvals]]**: The workflow for verifying new facility hosts or user compliance requests.

### 🗄️ Core Database Schema

_The foundational Supabase tables where the state of truth resides._

- **[[games (supabase)]]**: The primary registry for all events (Pickup, Tournament, League config).
- **[[matches (supabase)]]**: Individual game instances with scores and timer states.
- **[[bookings (supabase)]]**: The transactional link between a User and a Game (Status: Paid, Pending, Waitlist).
- **[[profiles (supabase)]]**: User identities, roles, wallet balances, and game stats.
- **[[facilities (supabase)]]**: Venue metadata, payment connections, and legal compliance.
- **[[notifications (supabase)]]**: The audit log of system-to-user communications.

*These tables act as the "Inventory" and "Ruleset" that the `games` and `facilities` tables rely on:*

- **[[leagues (supabase)]]**: The configuration for season-long play, pricing tiers, and season windows.
- **[[resources (supabase)]]**: The physical "Inventory" (e.g., Field 1, Court B) belonging to a facility.
- **[[activity_types (supabase)]]**: The global taxonomy of sports (Soccer, Padel, etc.).
- **[[system_settings (supabase)]]**: The key-value store for platform-wide toggles.

### Competitive Structuring (Tables)

These tables are the "glue" that holds the competitions together:

- **[[teams (supabase)]]**: The actual squad entities (Name, Captain, Colors).
- **[[tournament_registrations (supabase)]]**: The "Roster Context" hub. This is arguably the most important join-table in the system—it links a player to a team, a league, and a specific role (Captain vs. Player).

### Team Operations (Actions)

We have the "Join" logic, but not the "Management" logic for teams:

- **[[invite-actions]]**: The logic for sending and accepting team invites (converting individuals into a squad).
- **[[league-actions]]**: General administrative management for leagues (updating standings, adjusting schedules).
- **[[cancel-player-registration]]**: Specifically for the League/Tournament context, which is separate from the one-off "Leave" logic for Pickup games.

### The Physical Calendar (Critical Infrastructure)

- **[[resource_bookings (supabase)]]**: This is different from the `bookings` table. While `bookings` tracks _players_ joining games, `resource_bookings` tracks the **physical reservation of a field**. It is the "Master Calendar" that prevents a private rental from overlapping with a league game on Pitch 1.
- **[[resource_types (supabase)]]**: The taxonomy for fields (e.g., "Full Pitch," "Half Pitch," "Indoor Court").

### Marketing & Display Systems

- **[[promo_codes (supabase)]]**: The logic for discounts and promotional credits used during checkout.

### The "Queue" Management

- **[[waitlist]]**: The specific endpoint at `/api/waitlist` that handles high-speed "Queueing" for full games without requiring a Stripe transaction.

### The Rental Engine (New Action)

- **[[public-booking]]**: This is a major logic hub. While `join` handles individual event entries, `public-booking` manages the **"Request-to-Book"** flow for private rentals. It includes the platform's secondary collision engine, promo code redemption logic for rentals, and a dedicated notification pipeline that alerts staff via the `NewRequestEmail` template.

### The Lineup Layer (New Table)

- **[[match_players (supabase)]]**: This is the data bridge between `profiles` and `matches`. It is the "Lineup" table that tracks which players actually participated in a specific match, their check-in status, and eventually their match-specific stats.

### The Ruleset Junctions (New Table Category)

- **[[junction_rules (supabase)]]**: This covers `facility_activities` and `resource_activities`. These tables are the "Policy Connectors" that define the platform's taxonomy—telling the system, for example, that "Pitch 1" supports "Soccer" but not "Padel."
- **[[facility_activities (supabase)]]**: The platform's "Global Capability Map," mathematically defining which sports and services a physical venue is officially authorized to host.**
- **[[resource_activities (supabase)]]**: The platform's "Inventory Ruleset," mathematically defining the physical compatibility of each individual field or court with the various sport categories across the ecosystem.

### The Network Engine (New Action)

- **[[admin-marketplace]]**: This is a high-authority logic hub. It enables the **"PitchSide Network Model,"** where Super-Admins can "Claim" physical slots at a facility to host a PitchSide-owned tournament or pickup game. It contains a specialized "Network Collision" engine and a unique color-coding system (`#ccff00`) to differentiate HQ-owned bookings from local facility rentals.

### The Staffing Layer (New Action)

- **[[facility-team]]**: This action manages the **"Human Resource"** side of a facility. It handles the invitation, role-assignment, and removal of facility-specific staff members (Coaches, Referees, and secondary Admins).

### The Global Draft Board (New Action)

- **[[free-agents]]**: While you have the "Drafting" logic documented, this action manages the **"Marketplace Listing"** for free agents—handling the visibility, filtering, and status-updates for players waiting to be picked up by a squad.

### The Revenue Control (New Action & Table)

- **[[platform_settings (supabase)]]**: This is a singleton table (typically row ID `1`) that acts as the platform's **"Global Tax Authority."** It stores the master configuration for platform fees (Fixed vs. Percentage).
- **[[admin-financials]]**: The server action (found in `src/app/actions/admin.ts`) that allows Super-Admins to update the global fee structure. It includes a specialized "Master Admin Lock" and handles the mathematical conversion of raw UI inputs into stored database cents.

### The Rental Cancellation (New Action)

- **[[cancel-booking]]**: This action is the logical inverse of **[[public-booking]]**. While participants use **[[leave]]** for games, venue owners use **[[cancel-booking]]** to manage the lifecycle of **physical resource rentals**, including status reconciliation and automated removal from the host's calendar.

### The Validation Hub (New Action)

- **[[payments-utility]]**: Found in `src/app/actions/payments.ts`, this is the centralized **"Verification Engine."** It contains the `validatePromoCode` logic that is shared across the entire ecosystem, ensuring that expiration dates, usage limits, and facility-specific rules are applied consistently during every transaction.

### The League Roster Table (New Table)

- **[[league_matches (supabase)]]**: While you have documented `matches` (used for pickup games and tournaments), the system uses a separate **`league_matches`** table for season-long play. This table is the "Master Schedule" for the entire league, specifically tracking the home/away pairings, finalized season scores, and the `status` of matches within a specific league window.

### The Score Submission Logic (New Action)

- **[[league-matches]]**: This action (found in `src/app/actions/league-matches.ts`) is the platform's **"Official Box Score"** for leagues. It implements the high-authority security gate that ensures only a verified Host or Super Admin can submit final match results, and it triggers the `revalidatePath` that updates the public standings and goal difference calculations.

### The Administrative Master (New Action)

- **[[update-game]]**: This is the **"Metadata Command Center"** for every event on the platform. It is a dense logic hub that:
    - **Intelligently Toggles schemas**: It dynamically switches between Pickup, Tournament, and League data structures during an update (e.g., enforcing `team_price` for leagues while stripping `max_players` for tournaments).
    - **Bypasses RLS for Deletion**: It contains the `hardDeleteGame` logic, which utilizes the `service_role` admin client to permanently purge event records that standard facility users cannot delete.
    - **Global Cache Pulse**: It triggers a "Revalidation Cascade," forcing the platform to refresh the Admin Portal, Public Landing Pages, User Dashboards, and the Master Schedule simultaneously to ensure zero-latency synchronization.

### The Secret Vault (New Utility Hub)

- **[[stripe-utils]]**: Found in `src/lib/stripe.ts`, this is the platform's **"Low-Level Engine."** While you have documented the _actions_ (like `checkout` and `stripe`), this utility hub handles the high-stakes internal math that ensures the system's financial integrity:
    - **Metadata Serializer**: The specialized logic for "packing" complex PitchSide objects (booking IDs, team assignments, and referral codes) into Stripe's restrictive 500-character metadata strings.
    - **Idempotency Logic**: The "Safety Net" that generates unique keys for every transaction, mathematically preventing duplicate charges if a user double-clicks a payment button or a network request is re-tried.
    - **The Cent-Symmetrizer**: The platform's mathematical "Bridge" that ensures every dollar-based UI input is perfectly synchronized with Stripe's integer-based **cent** model, preventing floating-point discrepancies in the escrow accounts.

### The State Preserver (New Table)

- **[[pending_checkouts (supabase)]]**: Found in the `2026-03-28` migrations, this is the platform's **"Atomic Safety Net."** It acts as the high-integrity bridge between a User's intent and Stripe's final confirmation. It stores the temporary state of a transaction (including vaulted referral codes, guest details, and promo contexts) before the `[[stripe]]` webhook finalizes the record into the `bookings` table. Without this entry, the documentation of the "Truth Bridge" logic is slightly incomplete, as it explains _where_ the webhook data is staged before it becomes a permanent booking.

### The Championship Engine (New Action Hub)

- **[[playoff-generator]]**: Found in `src/app/actions/tournament.ts`, this is the platform's **"Qualifying Standings Authority."** While `seedPlayoffBracket` handles the physical transition, this hub manages the high-stakes mathematical qualifying logic:
    - **Standings Calculation**: The official algorithm (`Points > GD > GF`) that determines which teams qualify for the post-season.
    - **Mercy Rule Enforcement**: Implements the `mercy_rule_cap` in real-time, capping goal differences in lopsided matches to ensure fair tournament rankings.
    - **Adaptive Bracketing**: It intelligently switches the competitive structure on-the-fly (e.g., jumping straight to a Final if only 2 teams qualify, or building a Semi-Final bracket if 4 or more qualify).
    - **"TBD" Pipeline**: Manages the creation of future-state matches (e.g., "Winner Semi-1 vs Winner Semi-2"), allowing the brackets to be visualized before the winners are determined.