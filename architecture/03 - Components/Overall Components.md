### 🛡️ Admin Components

_Location: `src/components/admin`_

- **[[GameForm]]**: Gateway for creating Standard, Tournament, and League events.
- **[[UserTable]]**: Global player database and role management interface.
- **[[SiteEditor]]**: Content management system for landing page assets.
- **[[LiveCalendarLoader]]**: God-view facility schedule monitor.
- **[[FinancialSettingsForm]]**: Marketplace revenue and fee engine configuration.
- **[[ActivityItem]]**: Individual row for the Global Activity Registry.
- **[[ResourceItem]]**: Individual row for Global Resource Archetypes.
- **[[AdminGameList]]**: The primary feed controller for all global events.
- **[[MatchManager]]**: The centralized engine for scoring and player performance tracking.
- **[[AdminLeagueControl]]**: The organization hub for season-long competitive play.
- **[[PlayerVerificationModal]]**: The security gate for identity and waiver verification.
- **[[AdminClaimModal]]**: The interface for facility owners to prove and claim ownership of venue profiles.
- **[[AdminCard]] Stack**: Specialized cards ([[AdminLeagueCard]], [[AdminPickupCard]], [[AdminTournamentCard]]) that expose administrative controls (cancel, edit, refund) directly in the feed.
- **[[MicroTournamentManager]]**: A specialized sub-engine for fast-paced, small-bracket competitions (e.g., 4-team round robins).
- **[[ScheduleGenerator]]**: The algorithmic engine for bulk-creating game slots based on facility availability.
- **[[TeamManager]]**: Granular admin control over team rosters, renaming, and captain reassignment.

### 🏢 Facility Components (Host Specific)

_Location: `src/components/facility`_

- **[[LegalSettingsForm]]**: Management of facility-specific waivers and terms.
- **[[ManageLeagueTabs]]**: Organization hub for league stages, teams, and standings.
- **[[InviteStaffModal]]**: Permission-based invitation system for facility employees.
- **[[FacilityResourceItem]]**: Management of specific fields/courts within a facility.
- **[[KioskWrapper]]**: Specialized layout for public-facing booking terminals.
- **[[LeagueRowActions]]**: Context menu for facility-led league operations.
- **[[LeagueBuilderForm]]**: The high-complexity, multi-step wizard used by facility owners to launch new seasons.
- **[[FacilityProfileForm]]**: Management of venue branding, hours of operation, and contact metadata.
- **[[BookingModal]]**: The "internal" version of the booking tool used by staff to manually reserve spots.
- **[[FieldProjector]]**: A dedicated, high-visibility scoreboard for individual fields, designed for on-pitch tablets or LED displays.
- **[[TournamentDisplay]]**: The automated facility broadcast feed that cycles between live leaderboards and concurrent match results.
- **[[LiveProjectorPage]]**: An immersive, full-screen companion for pickup games featuring the official match timer and rotation queue.
- **[[StandingsTable]]**: The primary mathematical engine for calculating real-time rankings, points, and goal-difference tie-breakers.

### 🌎 Public Components (Player Facing)

_Location: `src/components/public`_

- **[[PlayerCommandCenter]]**: The primary mobile-first hub for active players.
- **[[PublicFacilityCalendar]]**: Public-facing schedule view for player bookings.
- **[[PublicFacilityCard]]**: Venue discovery card for the exploration feed.
- **[[PublicBookingModal]]**: Checkout entry point for court/field rentals.
- **[[LeagueRegistrationForm]]**: Team entry and player draft registration.
- **[[CaptainDashboard]]**: Roster and match management for team leaders.
- **[[StripeCheckoutModal]]**: Integrated secure payment interface.
- **[[TournamentCard]] / [[LeagueCard]]**: Discovery modules for competitive events.
- **[[DraftConfirmationModal]] / [[LeaveConfirmationModal]]**: State-change guards.

### 🧩 Shared & System Components

_Location: `src/components/`_

- **[[GameCard]]**: Standardized display for pickup games and events.
- **[[FreeAgentCard]]**: Showcase card for the draft-pool player list.
- **[[Sidebar]]**: Main application navigation node.
- **[[GameMap]]**: Interactive geolocation engine for venue discovery.
- **[[EmbeddedCheckoutModal]]**: Lightweight payment integration.
- **[[VotingModal]]**: Player-led governance (MVP/Fair Play voting).
- **[[WaiverModal]]**: Mandatory legal entry gate for all players.
- **[[InstallPrompt]]**: PWA installation driver.
- **[[ChatInterface]]**: The real-time messaging engine used in match lobbies and team channels.
- **[[JoinGameModal]]**: The primary interaction node for entering any competition, handling team selection and pro-rated payment logic.
- **[[AuthButton]]**: The central state manager for user session transitions in the header.
- **[[Navbar]]**: The top-level application navigation and global user-state indicator.

### 🎨 UI Foundation

_Location: `src/components/ui`_

- Standardized UI tokens including **Button**, **Input**, **Toast**, **Badge**, **Card**, and **Skeleton** loaders.