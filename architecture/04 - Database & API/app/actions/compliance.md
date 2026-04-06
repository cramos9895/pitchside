# ⚙️ compliance

**Type:** #api #database #administration **Location:** `src/app/actions/compliance.ts`

## 📄 Expected Payload / Schema

- **checkInPlayer**: `bookingId`, `gameId`, `matchId` (optional), `status` (boolean), `mode` ('global' | 'match').
- **toggleManualWaiver**: `bookingId`, `gameId`, `status` (boolean).
- **updatePlayerPhoto**: `userId` (Registration ID), `gameId`, `formData` (containing the image `File`).

## 🛡️ Security & Permissions

- **RLS Policy**: Actions use the standard `createClient()` (Server Client), meaning the calling user must have appropriate administrative permissions defined in the database RLS.
- **Storage Access**: Inherits bucket-level permissions from the Supabase `avatars` storage configuration.

## 🧪 Business Logic & Math

- **Polymorphic Check-In Logic**:
    - **Global Mode**: Synchronizes the `checked_in` flag across both the `bookings` and `tournament_registrations` tables. This is primarily used for front-desk check-ins.
    - **Match Mode**: Performs an `upsert` on the `match_players` junction table. This allows referees to track which players specifically stepped onto the pitch for a given match, even if they were checked into the facility earlier.
- **Manual Waiver Override**:
    - Provides an "Exception Path" for facility compliance. If a digital waiver fails or a player is a minor with a paper signature, staff can toggle the `has_physical_waiver` flag to unlock the player's eligibility status.
- **Verification Photo Engine**:
    - **Validation**: Enforces `image/*` MIME type checks on the server-side before storage ingestion.
    - **Storage Pathing**: Generates a deterministic filename (`userId-timestamp.ext`) and uploads it to the root of the `avatars` bucket.
    - **Identity Linking**: Automatically retrieves the `publicUrl` and writes it to the `verification_photo_url` column in the registrations table, enabling "sideline visual verification" for officials.

## 🔄 Returns / Side Effects

- **Returns**: `{ success: true, publicUrl?: string }`.
- **Multicast Revalidation**: Purges the cache for multiple operational routes:
    - `/admin/matches/[id]/manage`: For live referee updates.
    - `/admin/games/[id]`: For host roster overviews.
    - `/admin/games/[id]/display`: For facility-wide check-in status broadcasts.

---

**`compliance` is the platform's "Sideline Authority," providing the technical bridge between administrative verification and live match participation.**