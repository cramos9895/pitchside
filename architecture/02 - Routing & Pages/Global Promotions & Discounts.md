# 📄 Global Promotions & Discounts

**Path:** `src/app/admin/(dashboard)/settings/promotions/page.tsx` (Platform Marketing Hub)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Global Marketing Header:** A standardized administrative header featuring the `Tag` icon. It identifies the page as the high-level management hub for discount codes that apply across all PitchSide facilities.
    - **[[PromotionsClient]] (Unified Promo Hub):** A sophisticated client-side module designed for high-impact marketing operations:
        - **Promotion Card Grid:** A responsive list of active codes. Each card displays the raw code string, discount magnitude, current usage vs. limit, and expiration countdown.
        - **Conditional Styling:** Automatically dims and red-borders cards if they are "Expired" or "Depleted," providing instant visual auditing for active campaigns.
        - **The Code Forge (Creation Form):** An expandable interface for minting new promotions. Features include:
            - **Random VIP Generator:** Generates high-entropy unique strings (e.g., `8K2PL9A3`) with a single click—automatically defaulting to a single-use limit.
            - **Polymorphic Valuation:** Toggle between `percentage` (e.g., 20%) and `fixed_amount` (cent-based, e.g., $10.00).
            - **Temporal Controls:** Date-picker integration for setting "End of Day" (23:59:59) expiration timestamps.
        - **Deletion Safeguard:** A confirmation-gated `Trash2` action for permanently removing promotions from the system registry.
- **Imported Custom Components:**
    
    - [[PromotionsClient]] (The shared component used for both Global and Facility-specific marketing).
- **Icons (lucide-react):**
    
    - `Tag`, `Plus`, `Trash2`, `Percent`, `DollarSign`, `Calendar`, `Clock`

## 🎛️ State & Variables

- **The Promo Model:**
    - **`discount_value` Handling:** Values are stored as integers. For percentage types, this is the literal percent (e.g., `20`). For fixed amounts, this is stored in **cents** to ensure floating-point precision during checkout.
    - **Usage Tracking:** Displays `current_uses` against the optional `max_uses` constraint.
- **Master Authorization:**
    - Access is strictly gated at the server level to `master_admin` or `super_admin`. Regular facility hosts are redirected to the root `/` to prevent unauthorized cross-facility discounting.
- **Reactivity Pattern:**
    - Uses a combination of local state (`setPromos`) for optimistic UI responsiveness and Next.js `router.refresh()` for reliable backend synchronization.

## 🔗 Links & Routing (Outbound)

- `/login` (Standard Auth Fallback)
- `/` (Unauthorized Access Redirect)

## ⚡ Server Actions / APIs Triggered

- **Supabase Direct Persistence:** The component communicates directly with the `promo_codes` table via the authenticated client, utilizing the `facility_id: null` filter to maintain platform-wide scope.

---

**The Global Promotions hub is the platform's primary growth-lever, allowing Master Admins to orchestrate network-wide marketing campaigns and single-use VIP rewards with a unified interface.**