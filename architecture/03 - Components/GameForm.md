# 🧩 GameForm

**Type:** #component **Location:** `src/components/admin/GameForm.tsx`

## 📥 Props Received

- **initialData** (any): Pre-existing game data for edit mode.
- **action** ('create' | 'edit'): Defines whether the form is in initialization or update mode.
- **onSuccess** (() => void): Optional callback executed after a successful save.

## 🎛️ Local State & UI Logic

- **`activeTab`**: Bridges three distinct form schemas: **Standard Pickup**, **Micro-Tournament**, and **Multi-Week League**.
- **Dynamic Field Injection**: Renders specific configurators (e.g., `TournamentStyle`, `LeagueTimeline`) based on the `activeTab`.
- **`teams` ([[TeamConfig]]):** Manages a list of team names, colors, and player limits. Includes "Auto-Gen" logic to distribute capacity across a set number of teams.
- **Google Places Integration**: Uses `usePlacesAutocomplete` and `useLoadScript` to provide real-time location suggestions and coordinate derivation (`lat`/`lng`).
- **Timeline Validator**: Special logic for leagues to ensure `Roster Lock` < `Season Start` < `Roster Freeze` < `Playoff Start`.
- **Stripe/Payment Guard**: Automatically switches `allowed_payment_methods` to `['stripe']` and disables toggles when a Tournament or League is selected, enforcing platform-wide financial security.

## 🔗 Used In (Parent Pages)

- `src/app/admin/(dashboard)/create-game/page.tsx`
- `src/app/admin/(dashboard)/facilities/[id]/page.tsx` (For game editing within venue context)

## ⚡ Actions & API Triggers

- **[[updateGame]]**: A server action triggered when `action === 'edit'` to persist changes to an existing record.
- **[[supabase.from('games').insert]]**: Direct database injection for new events, automatically attaching the current user as a `host_ids` member.
- **`router.refresh()`**: Invoked post-submission to clear server-side caches and update the admin dashboard list.
- **Coordinate Lookup**: Calls `getGeocode` and `getLatLng` when a location is selected from the suggestion list.

---

**GameForm is the most complex administrative component in the system, utilizing a polymorphic schema to handle everything from 1-hour rentals to 3-month competitive leagues within a single unified interface.**