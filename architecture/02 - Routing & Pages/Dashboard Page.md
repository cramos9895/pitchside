## 🧩 Components & UI

- **Major UI Sections (via [[DashboardLayout]]):**
    
    - **Header Area:** A consistent top-level title "Player Hub" that spans across all sub-dashboards.
    - **Persistent Tab Navigation:** A specialized navigation sidebar (or horizontal scroll bar on mobile) that allows users to toggle between three core pillars:
        - **Overview:** The primary consolidated feed.
        - **My Schedule:** Comprehensive list of joined matches and rentals.
        - **Billing & Contracts:** Management of financial transactions and recurring agreements.
- **Major UI Sections (via [[DashboardOverviewPage]]):**
    
    - **Wallet & Profile Utility:** A dynamic bar displaying the user's **PitchSide Wallet** balance and providing a quick bridge to the profile settings.
    - **Next Up Section:** A concentrated area that renders the single most imminent activity (Game, League, or Tournament).
    - **Action Items Sidebar:** A high-visibility sidebar dedicated to "Action Required" items, specifically `resource_bookings` with an `awaiting_payment` status.
    - **Ambient Background:** A radial gradient overlay that gives the dashboard a premium, "Control Center" aesthetic.
- **Imported Custom Components:**
    
    - [[LeagueCard]] (Next Up display for leagues)
    - [[TournamentCard]] (Next Up display for tournaments)
    - [[GameCard]] (Next Up display for pickup games)
- **Icons (lucide-react):**
    
    - `LayoutDashboard`, `CalendarDays`, `Receipt`, `Calendar`, `Clock`, `MapPin`, `AlertCircle`, `Loader2`, `User`, `Trophy`, `Users`, `ArrowRight`, `Check`, `DollarSign`
- **Buttons / Clickable Elements:**
    
    - **"Overview / My Schedule / Billing" Tabs:** Navigation triggers that switch between dashboard sub-routes.
    - **"View Profile" Link:** Direct navigation to `/profile`.
    - **"Complete Secure Payment" Button:** A yellow CTA that triggers the Stripe checkout process for pending rental contracts.
    - **"Find Match" Button:** (Empty state) Drives users to the `/schedule` page.

## 🎛️ State & Variables

- **React State (Client-Side):**
    
    - `loading`: Tracks the initial data aggregation phase.
    - `unifiedEvents`: A sorted array of all upcoming rentals, pickups, tournaments, and leagues.
    - `actionRequiredRentals`: A grouped array of unpaid bookings requiring immediate user attention.
    - `isPayingContract`: Tracking state for active Stripe checkout sessions.
    - `creditBalance`: Current wallet funds (in cents).
- **Navigation Logic ([[DashboardLayout]]):**
    
    - `pathname`: Uses [[usePathname]] from Next.js to determine the active route and apply "Active" styling (`bg-white/10 text-pitch-accent`).
- **Database Queries (Client-Side):**
    
    - **Auth Check:** `[[supabase.auth.getUser]]` redirects unauthenticated users to `/login`.
    - **Profile Data:** Fetches `credit_balance` from the `profiles` table.
    - **Consolidated Feed Fetch:** Performs a [[Promise.all]] to retrieve `resource_bookings`, pickup `bookings`, and `tournament_registrations` simultaneously.

## 🔗 Links & Routing (Outbound)

- `href="/dashboard"` (Overview Tab)
- `href="/dashboard/schedule"` (My Schedule Tab)
- `href="/dashboard/billing"` (Billing & Contracts Tab)
- `href="/profile"` (Direct Profile Navigation)
- `href="/games/[id]"` (Detailed Pickup Game route)
- `href="/tournaments/[tournamentId]/team/[teamId]"` (Captain's Team Command Center)

## ⚡ Server Actions / APIs Triggered

- [[createClient]] (Instantiates the client-side Supabase connection)
- [[createContractCheckoutSession]] (Server action that initiates Stripe checkout for recurring booking groups)
- [[usePathname]] (Synchronizes the UI with the current navigation state)