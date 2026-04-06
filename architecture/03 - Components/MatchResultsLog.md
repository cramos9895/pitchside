# 🧩 MatchResultsLog

**Type:** #component **Location:** `src/components/admin/MatchResultsLog.tsx`

## 📥 Props Received

- **matches** (array of [[Match]]): The full list of historic matches belonging to the event.
- **teams** (array of TeamConfig): The team configurations dictating name mapping.
- **onUpdate** (() => void): Callback triggered after successfully editing a match score to refresh the parent view (specifically to trigger a `StandingsTable` recalculation).

## 🎛️ Local State & UI Logic

- **Completed Matches Filter**: Automatically screens out `scheduled` or `active` ghost matches, specifically isolating historical records with `status === 'completed'` and `round_number > 0`.
- **Round Grouping Engine**: Reduces the flat match array into a dynamically partitioned object (`Record<number, Match[]>`), sorting them sequentially upward (Round 1, Round 2... Final Round).
- **Inline Editing State**:
    - **`editingMatchId`**: Tracks the UUID of the match currently unlocked for rapid admin modification.
    - **`editScores`**: A dual-input cache (`{ home: number, away: number }`) holding uncommitted keystrokes before hitting Save.
- **Score Neutralizer**: Dynamically applies `text-pitch-accent` to the winning team element, reinforcing visual hierarchy without overriding global system styles.

## 🔗 Used In (Parent Pages)

- `src/app/admin/(dashboard)/games/[id]/page.tsx` (Tournament View Panel)

## ⚡ Actions & API Triggers

- **[[matches]]**: Fires a direct `POST` to `/api/matches` instructing an `update` action with the corrected `home_score` and `away_score`. Bypasses heavyweight mutations and triggers an immediate local `router.refresh()`.

---

**MatchResultsLog serves as a critical audit trail and administrative override mechanism for standard pickup games, delivering a post-facto review interface that drives direct changes to the leaderboard standing calculation.**
