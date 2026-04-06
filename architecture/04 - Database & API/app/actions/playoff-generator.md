# ⚙️ playoff-generator

**Type:** #api #database #competition  
**Location:** `src/app/actions/tournament.ts`

## 📄 Expected Payload / Schema

- **generatePlayoffs**: `gameId` (UUID).

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Authorization Hierarchy**: Strictly restricted to the hosting **Facility Admin** or a **Global Super Admin**. The action verifies the user's `role` against a whitelist of `['admin', 'master_admin', 'host']` before executing the standings calculation to prevent unauthorized bracket manipulation.

## 🧪 Business Logic & Math

- **The "Standings Authority" Engine**:
    - This action is the platform's **Post-Season Architect**. it aggregates every completed match record and applies a multi-tier sorting algorithm (`Points > GD > GF`) to determine the top qualifying seeds.
- **Mercy Rule Calculation**:
    - Implements the `mercy_rule_cap` in real-time. If a match score exceeds the facility's defined cap (e.g., a 10-0 victory in a 5-cap league), the engine mathematically "compresses" the score to 5-0 for the purpose of standings calculation, ensuring competitive integrity.
- **Adaptive Bracketing**:
    - **The 4-Seed Path**: If sufficient teams qualify, the engine generates two Semi-Final pairings (`Seed 1 vs 4` and `Seed 2 vs 3`) and a "TBD" Final placeholder.
    - **The 2-Seed Path**: If fewer than 4 teams qualify, it intelligently adapts by generating a single "Championship Final" between the Top 2 seeds.
- **Placeholder Injection**:
    - Manages the creation of future-state matches with `home_team: 'TBD Semi 1 Winner'`. This allows the `StandingsTable` and `BracketUI` components to render the tournament path visually before the qualifying matches are actually played.

## 🔄 Returns / Side Effects

- **Returns**: Standardized response `{ success: true, message: string }` containing a count of the generated playoff matches.
- **UI Synchronization**: Triggers a dual `revalidatePath` for both the Admin Dashboard and the Public Event page. This ensures that the newly created playoff bracket is visible to participants and scouts immediately upon generation.

---

**`playoff-generator` act as the platform's "Season-End Authority," providing the high-integrity logic needed to mathematically transition a group-stage competition into a structured knockout championship.**