# 🧩 GameCard

**Type:** #component **Location:** `src/components/GameCard.tsx`

## 📥 Props Received

- **game** (object): The core event entity, including `start_time`, `end_time`, `max_players`, and `price`.
- **user** (object): The authenticated user's metadata.
- **bookingStatus** ('paid' | 'waitlist'): Determines if the user is already a participant.
- **hasUnreadMessages** (boolean): Triggers a visual notification pulse for the match lobby.

## 🎛️ Local State & UI Logic

- **Polymorphic Routing Agent**:
    - This component acts as the primary architectural entry point for all event listings.
    - It evaluates the `event_type` and automatically delegates rendering to **[[LeagueCard]]** or **[[TournamentCard]]** if appropriate, otherwise proceeding with the high-performance **Pickup Game** layout.
- **Real-Time Capacity Pulse**:
    - Uses Supabase Realtime to monitor the `games` table. If the player count updates elsewhere, the card instantly refreshes its "Join Now" vs. "Waitlist" CTA without a page reload.
- **Intelligent Duration Processing**:
    - Implements a robust time-math engine that handles multiple `end_time` formats (ISO8601 vs. HH:MM strings). It accurately calculates match length even for games that cross the midnight threshold.
- **Smart Notification Loop**:
    - Renders a pulsing red `shadow-[0_0_10px_rgba(239,68,68,0.8)]` dot if unread messages are detected, providing a critical "re-engagement" hook for match coordination.
- **Hybrid Action Footer**:
    - **Unjoined**: Offers a "Join Now" (or "Waitlist" if full) path.
    - **Joined**: Provides specialized "Match Lobby" and "Cancel Spot" CTAs.
    - **Cancelled/Completed**: Locks the interface with appropriate historical status labels.

## 🔗 Used In (Parent Pages)

- `src/app/page.tsx` (Homepage Feed)
- `src/app/dashboard/page.tsx` (User's Schedule)
- `src/app/admin/(dashboard)/games/page.tsx` (Platform Management)

## ⚡ Actions & API Triggers

- **[[cancelBooking]]**: A server-side transaction that handles player removal and processes automated wallet refunds.
- **[[JoinGameModal]]**: Triggers the configuration and payment funnel for the match.
- **[[EmbeddedCheckoutModal]]**: Orchestrates the final Stripe secure payment flow.

---

**GameCard is the platform's most versatile interaction unit, serving as a polymorphic dispatcher that handles 100% of event discovery and entry logic across all competition tiers.**