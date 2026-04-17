# 📄 Game Details Page

**Architecture:** Split Component Pattern (Next.js App Router)
- **Server Component (Entry):** `src/app/games/[id]/page.tsx` (Data Fetching & Guard Logic)
- **Client Component (Interactive):** `src/app/games/[id]/GameClientPage.tsx` (Messaging, Modals & State)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Hero Header:** A high-impact section at the top featuring match meta-data (Date, Time, Arena) and a dynamic **Status Bar** that changes colors based on the game's state. It includes the **League Host** badge for accountability.
    - **Competing Squads (Rolling Lobby):** A high-contrast section featuring **Obsidian Cards** (#171717) for registered teams, displaying captain names, player counts, and **Electric Volt (#cbff00)** recruitment badges.
    - **Tabbed Interface:** A horizontal navigation bar that organizes the hub into four primary areas:
        - **Match Details:** The default view containing marketing rules, prize info, and technical match specs.
        - **Squad Roster:** Displays the active roster, waitlist, and the interactive **Free Agent Pool**.
        - **Match Chat:** A real-time communication portal for participants.
        - **Tournament Hub:** (Conditional) Visible only for tournament-type events; displays standings and brackets.
    - **Match Intelligence Grid:** A 2x2 or 2x3 grid detailing the Surface Type, Footwear Requirements, Match Style, and Price.
    - **Captain’s Control Panel:** (Conditional) A specialized sidebar for team leaders to set recruitment fees and share invite links.
- **Imported Custom Components:**
    
    - [[JoinGameModal]] (The primary entry point for registration and payment)
    - [[ChatInterface]] (Handles real-time socket-based messaging)
    - [[RollingLeagueLobby]] (Dynamic lobby for unassigned league players)
    - [[GameMap]] (Venue location visualization)
    - [[FreeAgentCard]] (Recruitment UI for draft-style events)

## 🎛️ State & Variables

- **Server-Side Props (Prefetched):**
    - `initialGame`: Primary match record.
    - `initialHost`: Resolved profile of the primary commissioner.
    - `registeredTeams`: Optimized relational data (Team + Captain + Player Count).
- **React State (Client-Side):**
    - `game`: Synchronized data object for the match.
    - `bookings`: Active registration records.
    - `activeTab`: UI navigation state.
    - `isParticipant` / `isHost` / `isCaptain`: Role-based access flags.

## 💾 Data Strategy

- **Relational Queries (Server-Side):**
    - **Competitor Roll-up:** A single relational query joining `tournament_registrations` with `teams` and `profiles` to compute player counts and recruitment status.
    - **Primary Host:** Researches the first ID in the `host_ids` array to pull Commissioner contact details.
- **Real-Time Subscriptions (Client-Side):**
    - Subscribes to `bookings` and `messages` for immediate UI updates while the user is active in the hub.

## 🔗 Links & Routing (Outbound)

- `mailto:` (Dynamic link for contacting the League Host)
- `href="/schedule"` (Return to primary matches feed)
- `/invite/${game.id}?team=${team}` (Captain's dynamic referral link)