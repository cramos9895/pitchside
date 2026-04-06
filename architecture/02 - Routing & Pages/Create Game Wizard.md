# 📄 Create Game Wizard

**Path:** `src/app/admin/(dashboard)/create-game/page.tsx` (Event Creation Engine)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Event Type Selector:** A horizontal tab system (`standard`, `tournament`, `league`) that dynamically reconfigures the entire form schema based on the selected match category.
    - **Location Intelligence:** Powered by Google Places Autocomplete. Captures both human-readable addresses and raw `latitude`/`longitude` coordinates for map rendering.
    - **Dynamic Team Configurator:** An interactive module for defining squads. Features a "Team Generator" for bulk-creating teams and a color-synced naming system.
    - **Match Style & Format:** Granular selectors for `1v1` through `11v11` formats and specialized playstyles like "Winner Stays" (King) or "Standard".
    - **Payment & Refund Controls:** Toggles for Venmo, Zelle, and Stripe. Includes a flexible refund policy manager (hourly cutoff vs. explicit date/time).
- **Imported Custom Components:**
    
    - [[GameForm]]: The monolithic client component that houses the validation logic and form state.
- **Icons (lucide-react):**
    
    - `Calendar`, `Clock`, `MapPin`, `Users`, `DollarSign`, `Trophy`, `Shield`

## 🎛️ State & Variables

- **Conditional Logic Branches:**
    - **Standard Pickup:** Focuses on individual pricing, squad limits, and surface/shoe requirements.
    - **Tournaments/Leagues:** Activates "Stripe Only" enforcement, team registration fees, deposit management, and prize pool configurations (Fixed Bounty vs. Scaling Pot).
- **Automated Field Resolution:**
    - **End Time Prediction:** Automatically offsets the `end_time` by 60 minutes whenever the `start_time` is modified.
    - **Roster Balancing:** Automatically recalculates `team.limit` across all defined squads based on the `max_players` total capacity.
- **Form Validation:**
    - Enforces timezone-safe ISO string conversion for all temporal data.
    - Prevents "Free Games" from being created without selecting at least one valid payment method.

## 🔗 Links & Routing (Outbound)

- `/admin` (Redirect after successful creation or "Back" navigation)

## ⚡ Server Actions / APIs Triggered

- **Direct Supabase Interaction:** For new game creation, the component performs a direct `insert` into the `games` table via the Supabase client.
- [[updateGame]]: A server action invoked when the form is used in `edit` mode.
- `router.refresh()`: Triggered post-submission to invalidate the Admin Dashboard cache.

---

**The Create Game page is the most complex data-entry point in the system, handling polymorphic registration flows for three distinct business types (Pickup, Tournaments, and Leagues) within a single unified interface.**