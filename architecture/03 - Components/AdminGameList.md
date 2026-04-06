# 🧩 AdminGameList

**Type:** #component **Location:** `src/components/admin/AdminGameList.tsx`

## 📥 Props Received

- **initialGames** (array of [[Game]]): The raw list of events fetched via server-side props or a direct Supabase query.

## 🎛️ Local State & UI Logic

- **`activeTab`**: A persistent filter state ('Today', 'Upcoming', 'Past', 'Cancelled') that is saved to `localStorage` to maintain user context across page reloads.
- **Temporal Sorting Engine**:
    - Re-calculates game status in real-time by comparing `start_time` and `end_time` against the current browser clock.
    - Automatically shifts games from "Today" to "Past" once the calculated end time has elapsed.
- **Polymorphic Distribution**: Acts as a factory that maps raw game data to specialized sub-components:
    - **[[AdminPickupCard]]**: For standard 1-off games.
    - **[[AdminTournamentCard]]**: For bracketed events.
    - **[[AdminLeagueCard]]**: For multi-week season play.
- **Refund Monitor**: Implements a proactive badge system on the 'Cancelled' tab that alerts administrators if a cancelled game still has `refund_processed: false`.
- **Inline Editing Gateway**: Manages an overlay that injects the `GameForm` into a modal context, allowing for deep metadata modifications without navigating away from the list.

## 🔗 Used In (Parent Pages)

- `src/app/admin/(dashboard)/page.tsx` (Main Admin Hub)

## ⚡ Actions & API Triggers

- **[[hardDeleteGame]]**: A high-privilege server action that permanently wipes an event and its related roster data from the database.
- **[[supabase.from('games').update]]**: Used for the 'soft-cancel' workflow to change game status without deleting history.
- **`router.refresh()`**: Triggers a global Next.js data revalidation to ensure the list reflects the latest DB state after any modal action.
- **Cancellation Flow**: Utilizes a generic **[[ConfirmationModal]]** to prevent accidental clicks on destructive actions.

---

**AdminGameList.tsx is the primary logistics hub for the platform, providing a high-density, filtered view of every event currently active on the PitchSide network.**