# 🧩 MatchManager

**Type:** #component **Location:** `src/components/admin/MatchManager.tsx`

## 📥 Props Received

- **game** (any): The parent game record containing configuration and status.
- **bookings** (array of [[Booking]]): All players currently checked in, used for roster mapping and MVP selection.
- **onUpdate** (() => void): Callback triggered after successful data mutations to refresh the parent view.
- **filterMode** ('king' | 'tournament'): Defines the operating logic—**King of the Hill** (infinite rotation) or **Tournament** (structured rounds).

## 🎛️ Local State & UI Logic

- **Global Synchronized Timer**:
    - **`timerStatus`**: Tracks if the pitch clock is `running`, `paused`, or `stopped`.
    - **Real-Time Heartbeat**: Uses a `useEffect` interval that calculates `timeRemaining` by comparing the server-provided `timer_started_at` timestamp with the local system clock, ensuring sub-second synchronization across all devices.
    - **Supabase Realtime**: Subscribes to the `public.games` table for the specific Game ID, instantly updating the UI when another admin starts/stops the clock.
- **Tournament Orchestration**:
    - **`currentRound`**: Manages the "Active" round, hiding future matches to keep the admin interface focused.
    - **Round Buffering**: Scores are stored in a local `roundScores` object first, allowing the admin to verify all results before dispatching a batch update to the backend.
- **Live Match Recorder**: A dedicated "Quick Score" interface that uses a `useRef` based active-match tracker to prevent race conditions during rapid score increments.
- **Winner Logic Engine**: Calculates table standings on-the-fly (3 pts for a Win, 1 for a Draw) to identify the event champion and distribute profile-level awards.

## 🔗 Used In (Parent Pages)

- `src/app/admin/(dashboard)/page.tsx` (Dashboard Modal View)
- `src/app/facility/operations/page.tsx` (Venue "Check-In" Console)

## ⚡ Actions & API Triggers

- **[[matches]]**: The primary bridge for Match CRUD (Insert/Update/Delete).
- **[[finalizeGame]]**: A mission-critical server action that:
    1. Locks the event from further editing.
    2. Identifies the "Champion Team" based on weighted score differential.
    3. Issues "MVP Awards" to player profiles.
    4. Triggers revalidation for global leaderboards.
- **`supabase.from('games').update`**: Directly manages the high-frequency timer state to ensure low-latency clock control.

---

**MatchManager is the operational "heart" of the platform on game day, turning a static booking list into a dynamic, recordable sporting event with real-time stats and automated conclusion logic.**