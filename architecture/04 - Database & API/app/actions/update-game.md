# ⚙️ update-game

**Type:** #api #database #maintenance  
**Location:** `src/app/actions/update-game.ts`

## 📄 Expected Payload / Schema

- **updateGame**: `gameId` (UUID), `formData` (Object).
- **hardDeleteGame**: `gameId` (UUID).

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Authorization Gate**: For the `hardDeleteGame` operation, the action performs a proactive role-audit. It strictly limits permanent deletions to users with `admin`, `master_admin`, or `host` roles, preventing standard participants from sabotaging event records.
- **Admin Privacy Bypass**: Utilizes `createAdminClient()` for the hard deletion path. This is critical for overriding Supabase's standard RLS and cascade-delete protection, ensuring a clean purge of the record and its associated children (if configured).

## 🧪 Business Logic & Math

- **The "Polymorphic Data Hub"**:
    - This action is the platform's **Metadata Sanitizer**. It implements ternary processing to ensure the `games` record remains logically consistent based on its `event_type`.
    - **Logic Pivot**: For example, if an event is toggled to a `tournament` or `league`, the action automatically null-sets individual `price` and `max_players` fields, instead prioritizing `team_price` and `min_teams` to prevent data-structure collision.
- **The "Revalidation Cascade" Engine**:
    - This is the action's primary **Infrastructure Side Effect**. Upon a successful write, it triggers a massive, six-point cache purge:
        1. **Admin Portal**: Internal management views.
        2. **Public Event Page**: The participant's primary registration gate.
        3. **Global Schedule**: The venue's master calendar.
        4. **User Dashboard**: Participants' "My Games" section.
        5. **Platform Landing Page**: The marketplace index.
- **Master Configuration Support**:
    - Manages updates for over **50+ granular fields**, ranging from competitive rules (`roster_lock_date`, `min_teams`) to financial rewards (`prize_pool_percentage`, `reward`) and safety protocols (`strict_waiver_required`).

## 🔄 Returns / Side Effects

- **Returns**: Standardized response `{ success: true }` or throws a descriptive error (e.g., "Forbidden").
- **External Impact**: Triggers a global site-wide re-validation of the specific `gameId` across all cached routing segments.

---

**`update-game` is the platform's "Administrative Master Controller," providing the surgical, context-aware logic needed to manage the metadata and lifecycle of every event across the multi-tenant PitchSide ecosystem.**