# 📄 Game Details Page

**Path:** `src/app/games/[id]/page.tsx` (Match Hub & Registration)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Hero Header:** A high-impact section at the top featuring match meta-data (Date, Time, Arena) and a dynamic **Status Bar** that changes colors based on the game's state (Upcoming, Completed, or Cancelled).
    - **Tabbed Interface:** A horizontal navigation bar that organizes the hub into four primary areas:
        - **Match Details:** The default view containing marketing rules, prize info, and technical match specs.
        - **Squad Roster:** Displays the active roster, waitlist, and the interactive **Free Agent Pool**.
        - **Match Chat:** A real-time communication portal for participants.
        - **Tournament Hub:** (Conditional) Visible only for tournament-type events; displays standings and brackets.
    - **Match Intelligence Grid:** A 2x2 or 2x3 grid detailing the Surface Type, Footwear Requirements, Match Style, and Price.
    - **Captain’s Control Panel:** (Conditional) A specialized sidebar for team leaders to set recruitment fees and share invite links.
    - **MVP Voting Block:** (Conditional) Appears post-match to allow participants to vote for the best player on the pitch.
- **Imported Custom Components:**
    
    - [[JoinGameModal]] (The primary entry point for registration and payment)
    - [[ChatInterface]] (Handles real-time socket-based messaging)
    - [[GameMap]] (Interactive Leaflet or Mapbox integration for the venue)
    - [[FreeAgentCard]] (Recruitment UI for draft-style events)
    - [[VotingModal]] (MVP selection interface)
    - [[StandingsTable]] (Tournament leaderboard component)
    - [[EmbeddedCheckoutModal]] (Stripe-hosted checkout popup)
- **Icons (lucide-react):**
    
    - `Zap`, `Trophy`, `Crown`, `Shield`, `Activity`, `Target`, `Shirt`, `DollarSign`, `AlertTriangle`

## 🎛️ State & Variables

- **React State (Client-Side):**
    
    - `game`: The master data object for the match (title, price, rules, etc.).
    - `bookings`: An array of all registration records associated with the game.
    - `activeTab`: Controls the conditional rendering of the hub modules.
    - `isParticipant` / `isHost` / `isCaptain`: Boolean flags that unlock specific sub-sections (Chat, Captain Panel, etc.).
    - `stripeClientSecret`: State-driven trigger for the Stripe payment modal.
- **Core Business Logic:**
    
    - **Roster Management:** Logic that splits the `bookings` array into **Active Squad** (confirmed), **Waitlist** (FIFO), and **Free Agents** (pending draft).
    - **Refund Calculation:** A protective check that calculates if the current time is within 6 hours of kickoff to determine if a user gets a "Credit Refund" or a "Non-Refundable Leave".
    - **Checkout Flow:** Routes users through either Credit redemption, Wallet billing, or Stripe processing via [[/api/checkout]].
    - **Recruitment Logic:** Allows captains to set a `custom_invite_fee` which modifies the price for users joining via their invite link.
- **Database Queries (Client-Side):**
    
    - **Match Core:** [[supabase.from('games').select('*')]] with an ID filter.
    - **Roster Fetch:** Joins `bookings` with `profiles` to resolve player names and avatars.
    - **Tournament Data:** Fetches `matches` specifically for the current `game_id` to build brackets and standings.

## 🔗 Links & Routing (Outbound)

- `href="/schedule"` (Return to primary matches feed)
- `router.push('/dashboard')` (Redirect after leaving or completing an action)
- `/invite/${game.id}?team=${team}` (Captain's dynamic referral link)

## ⚡ Server Actions / APIs Triggered

- [[draftFreeAgent]] (Server action to finalize a recruitment move)
- [[checkout]] (Initializes a Stripe or Wallet session)
- [[leave]] (Finalizes the roster removal and refund logic)
- [[EmbeddedCheckoutModal]] (Client-side trigger for the secure payment popup)