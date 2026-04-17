# 🧩 TournamentLobbyClient

**Type:** #component #client 
**Location:** `src/app/tournaments/[id]/TournamentLobbyClient.tsx`
**Last Audited:** 2026-04-10

## 📥 Props Received
- `tournament`: `Tournament` - The core event data.
- `userId`: `string | null` - The current viewer's ID.
- `registrations`: `TournamentRegistration[]` - List of participants and team assignments.

## 📝 Data Schema / Types
- `interface Tournament` & `interface TournamentRegistration`
- Uses Supabase Realtime for table `tournament_registrations`.

## 🎨 Visual DNA (Layout & UI)
- **Container:** `max-w-7xl mx-auto px-6 py-12`
- **Tabs Logic:** `flex border-b border-white/10 mb-8` - Switches between "Overview", "Teams", "Matches", and "Admin".
- **Dynamic Brackets:** Renders the [[MatchManager]] and [[StandingsTable]] inside tab panels.

## 🎛️ Local State & UI Logic
- **Tab Management**: Tracks the active view using `useState`.
- **Registration Pipeline**: Handles "Join Team" and "Join as Free Agent" CTAs via [[api/checkout]].
- **Admin Elevation**: Conditional rendering of management tools (Brackets, Scores) if `userId === tournament.host_id`.
- **bracket-generator**: Orchestrates the initial seeding logic via Server Actions.

## 🔗 Used In (Parent Pages)
- [[Tournament Lobby Page]]

## ⚡ Actions & API Triggers
- **[[seedTournament]]**: Generates the initial match nodes.
- **[[generateLeagueSchedule]]**: (If in league mode) logic for match pairing.
- **[[api/checkout]]**: For entry fee processing.
