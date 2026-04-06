# ⚙️ sync-counts

**Type:** #api #database #maintenance  
**Location:** `src/app/api/sync-counts/route.ts`

## 📄 Expected Payload / Schema

- **GET Request**: No parameters required.
- **Implementation Hook**: Calls the core utility `syncPlayerCount(gameId)` located in `[[src/lib/games.ts]]`.

## 🛡️ Security & Permissions

- **System Authority**: The internal logic utilizes a **Supabase Service Role Key** (`SUPABASE_SERVICE_ROLE_KEY`). This allows the maintenance script to bypass all Row Level Security (RLS) and read-only constraints to perform a definitive audit of the `bookings` table.
- **Access Control**: Currently implemented as a GET request requiring cookie-based authentication, typically reserved for platform administrators to trigger via a manual dashboard button or a scheduled cron job.

## 🧪 Business Logic & Math

- **The "Data Healing" Loop**:
    - **Counter Drift Mitigation**: In high-concurrency systems, atomic increments can occasionally "drift" due to race conditions or interrupted Stripe webhooks. This action serves as the platform's **Ground Truth Reconciliation**.
    - **Mathematical Audit**: For every game ID, the action executes a `head: true` (count-only) query on the `bookings` table, filtering strictly for records matching `status: ['active', 'paid']`.
    - **Atomic Sync**: It then forcefully overwrites the `games.current_players` column with the result of this audit, clearing any "ghost" players or uncounted seats.
- **Bulk Processing**:
    - Uses an iterative loop to process every game in the database.
    - _Note: As the platform scales, this will likely be refactored into a batched queue or a direct Postgres SQL Function for performance._

## 🔄 Returns / Side Effects

- **Returns**: A JSON summary containing the `{ success: true }` status and an array of individual game IDs with their newly synchronized counts.
- **Side Effects**:
    - Triggers a system-wide update to the `current_players` state.
    - Any public-facing game cards or host portal lists will instantly reflect the corrected roster totals upon the next page refresh.

---

**`sync-counts` is the platform's "Self-Healing Nervous System," mathematically reconciling transactional history with real-time occupancy to ensure 100% data integrity.**