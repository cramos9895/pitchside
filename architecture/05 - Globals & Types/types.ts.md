# 📝 types.ts

**Type:** #globals #types 
**Location:** `src/types.ts`
**Last Audited:** 2026-04-10

## 📂 Core Interfaces

### [[Facility]]
Defines the high-level operational node (e.g., "Northwest Soccer Center").
- `id`: `string` (UUID)
- `name`: `string`
- `slug`: `string`
- `address`: `string | null`

### [[Resource]]
Defines a playable area within a facility (e.g., "Full Field", "Court 2").
- `id`: `string` (UUID)
- `facility_id`: `string` (FK)
- `name`: `string`
- `type`: `string | null`

### [[Game]]
The primary event entity (Pickup, League, or Tournament).
- *Note: This interface is often extended or redefined in components for specific use cases (e.g., `GameCard.tsx`).*
- `id`: `string`
- `title`: `string`
- `start_time`: `string`
- `price`: `number`
- `current_players`: `number`

---

**`types.ts` provides the foundational TypeScript contracts that ensure data integrity across the platform's API and UI layers.**
