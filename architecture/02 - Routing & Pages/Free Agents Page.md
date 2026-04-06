# 📄 Free Agent Pool Hub

**Path:** `src/app/free-agents/page.tsx` (Marketplace for Talent)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Draft Hub Header:** A premium branding section ("FREE AGENT POOL") that identifies the user's recruitment eligibility (e.g., "Drafting Enabled" for Captains).
    - **Talent Filter Bar:** A high-precision search input integrated with position-based filtering tabs (`GK`, `DEF`, `MID`, `FWD`) for rapid scouting.
    - **Global Talent Feed:** A chronological grid of available players. Each entry displays:
        - **[[FreeAgentCard]]**: The high-fidelity FUT-style card showing OVR, position, and lifetime stats.
        - **Match Context:** Specific metadata about which upcoming game or league the agent is available for.
    - **Recruiting Intel:** A series of informational blocks explaining the mechanics of drafting, OVR calculation, and payment eligibility at the bottom of the page.
    - **Empty State:** A stylized placeholder ("No Free Agents Found") that appears when filters yield no results, providing a "Reset" path.
- **Imported Custom Components:**
    
    - [[FreeAgentPoolClient]]: Manages the interactive state and drafting logic.
    - [[FreeAgentCard]]: Renders the high-performance player visual with rank-based styling.
- **Icons (lucide-react):**
    
    - `Trophy`, `Users`, `Search`, `Filter`, `Loader2`, `Shield`, `Zap`

## 🎛️ State & Variables

- **Scouting Logic:**
    
    - **Status Filtering:** The page exclusively fetches `bookings` with `status === 'free_agent_pending'`. These represent players who have successfully vaulted their payment methods but have not yet been assigned to a squad.
    - **Captain Validation:** The page cross-references the current user's `bookings` to identify if they are an active "Captain" (verified by the presence of a `stripe_payment_method_id`).
- **Interactive Drafting:**
    
    - **Global Context:** All agents are fetched on the server, but the ability to "Draft" is conditionally rendered based on the captain's membership in the associated game.
    - **Client Stats:** The grid dynamically scales based on `searchQuery` and `positionFilter` local states.
- **Data Resolution (Server-Side):**
    
    - **Relational Joining:** Uses Supabase joins to correlate `bookings` -> `profiles` (stats/bio) and `bookings` -> `games` (event info).

## 🔗 Links & Routing (Outbound)

- `/free-agents` (Self-referential for filter resets)
- `/schedule?view=pickup` (Redirect for non-captains looking to play)
- `/login` (Auth guard)

## ⚡ Server Actions / APIs Triggered

- [[draftFreeAgent]]: The mission-critical action used by captains to recruit agents. It initiates the **Stripe Off-Session Charge** and upgrades the agent's booking status from `free_agent_pending` to `paid`.
- `Suspense`: Enables a "Global Talent Feed" loading skeleton while asynchronously fetching the talent roster.