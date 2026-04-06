# ⚙️ league-matches

**Type:** #api #database #stats  
**Location:** `src/app/actions/league-matches.ts`

## 📄 Expected Payload / Schema

- **submitMatchScore**: `matchId` (UUID), `leagueId` (UUID), `formData` (`home_score`, `away_score`).

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Authorization Hierarchy**: Implements a strict two-tiered permission check. The action verifies that the caller is either a **Global Admin** (`super_admin` / `master_admin`) or specifically the **Facility Admin** associated with the venue that owns the league. Matches cannot be modified by captains or players.
- **Ownership Verification**: Before executing any update, the action performs a proactive server-side fetch of the `leagues` table. It compares the `league.facility_id` against the authenticated user's `profile.facility_id` to ensure absolute multi-tenant sovereignty.

## 🧪 Business Logic & Math

- **The "Official Box Score" Engine**:
    - This action is the platform's primary **Standings Authority**. It transitions a match from a scheduled event into a historical data point.
- **Status Promotion Logic**:
    - Successfully submitting scores automatically triggers a hard state change on the match `status` to **`completed`**. This transition signals the `StandingsTable` component to include the result in point-table calculations.
- **Sanitization & Numeric Integrity**:
    - The action performs defensive server-side parsing ( `parseInt` ) on raw `formData`. It explicitly checks for `NaN`, `null`, and empty string values to prevent the league's goal-differential and win/loss records from being corrupted by malformed inputs.

## 🔄 Returns / Side Effects

- **Returns**: Standardized response `{ success: true }` or a descriptive error (e.g., "Unauthorized" or "Both scores are required").
- **UI Synchronization**: Triggers `revalidatePath` for the specific league's administrative portal (`/facility/leagues/${leagueId}`). This ensures that the venue host sees the updated standings and schedule instantly without a manual page refresh.

---

**`league-matches` is the platform's "Results Gatekeeper," providing the secure, validated logic needed to transform match-day results into season-long standings and competitive rankings.**