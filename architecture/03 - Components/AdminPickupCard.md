# 🧩 AdminPickupCard

**Type:** #component **Location:** `src/components/admin/AdminPickupCard.tsx`

## 📥 Props Received

- **game** (Game object): The primary data structure containing the pickup game's `title`, `start_time`, `max_players`, and `match_style`.
- **onEdit** (function): Proxy callback to trigger the `GameForm` in Edit Mode.
- **onCancel** (function): Proxy callback to trigger the soft-deletion (Cancelled status) of the match.
- **onHardDelete** (function): Proxy callback for Master Admins to perform a full database wipe.

## 🎛️ Local State & UI Logic

- **Precision Duration Engine**:
    - Dynamically calculates the `durationStr` (e.g., "1h 30m") by parsing the `end_time` string—which may be a full ISO date or a simple "HH:mm" timestamp—against the `start_time`.
    - If `end_time` is missing, it defaults to a 90-minute standard match duration.
- **Financial Liability Gate**:
    - Specifically monitors for the "Cancelled & Unrefunded" state (`isRefundPending`). If true, the card adds a high-contrast `bg-red-500` “Refund Needed” badge and switches the primary CTA to "Process Refund," flagging a manual payout is required.
- **Live Match Pulse**:
    - Automatically detects if the current time is within the match window. If true, it renders a `bg-yellow-500` "Live Now" banner with an `animate-pulse` effect to draw immediate attention.
- **Glanceable Status Architecture**:
    - Features a persistent vertical left-side bar that shifts colors based on the match's lifecycle:
        - **Yellow**: "Live"
        - **Green**: "Completed"
        - **Red**: "Cancelled"
- **Roster Delta Visualization**:
    - Clearly displays both the total count (`12/14`) and the remaining availability (`2 Spots Left`) in the roster summary.

## 🔗 Used In (Parent Pages)

- `src/components/admin/AdminGameList.tsx` (The primary administrative feed controller)

## ⚡ Actions & API Triggers

- **`Link` to `/admin/games/${game.id}`**: Navigates to the `MatchManager` portal for live scoring or attendance check-in.
- **`onHardDelete`**: For Master Admins only, providing a database-level purge of the record.

---

**AdminPickupCard is the platform's primary unit for pickup game logistics, optimized for rapid attendance monitoring and financial liability tracking.**