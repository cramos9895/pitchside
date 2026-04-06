# 📄 Revenue Engine & Financials

**Path:** `src/app/admin/(dashboard)/settings/financials/page.tsx` (Marketplace Fee Control)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Revenue Engine Header:** A standardized administrative header featuring the `Receipt` icon. It defines this page as the mathematical "Heart" of the PitchSide marketplace, controlling how revenue is extracted from public checkout sessions.
    - **[[FinancialSettingsForm]] (Core Engine):** A high-precision client component for managing platform monetization.
        - **Fee Model Selector:** A specialized radio-card interface for toggling the platform's pricing strategy:
            - **Percentage Model:** Takes a variable cut of the total transaction.
            - **Fixed Model:** Applies a flat service fee regardless of transaction size.
            - **Hybrid Model:** Combines both a percentage cut and a fixed surcharge for maximum revenue capture.
        - **Dynamic Input Masking:** Uses conditional Tailwind classes (`opacity-30 pointer-events-none`) to visually "lock" inputs that do not apply to the currently selected fee model, preventing user error.
        - **Precision Inputs:** Features a percentage-step input (e.g., 5.1%) and a currency-masked fixed fee input.
    - **Stripe Transparency Footer:** A dedicated instructional block clarifying the distinction between **PitchSide Platform Fees** and **Stripe Processing Fees** (2.9% + 30¢), ensuring administrators understand the net revenue implications.
- **Imported Custom Components:**
    
    - [[FinancialSettingsForm]] (The data-entry and validation module for platform tax logic).
- **Icons (lucide-react):**
    
    - `Receipt`, `Settings`, `Home`, `DollarSign`, `Percent`, `Plus`, `Check`

## 🎛️ State & Variables

- **The Financial Data Model:**
    - Controlled via a singleton record in the `platform_settings` table (ID: 1).
    - **`fee_fixed` (Integers/Cents):** For database reliability, fixed fees are stored as integers (cents). The UI performs a `cents / 100` transformation for user-friendly dollar editing.
- **Master Authorization:**
    - Access is strictly gated to account types with `role === 'master_admin'` or `system_role === 'super_admin'`.
- **Validation Logic:**
    - The `FinancialSettingsForm` handles the logic for ensuring fee percentages do not exceed 100% and that fixed surcharges are non-negative.

## 🔗 Links & Routing (Outbound)

- `/admin/settings` (Navigation back to the Settings Hub)
- `/admin` (Shortcut to the Primary Admin Dashboard)
- `/login` (Standard Auth Fallback)

## ⚡ Server Actions / APIs Triggered

- [[updatePlatformFees]]: The primary server action that persists the financial schema and triggers a platform-wide revalidation to update checkout calculations.
- [[createClient]]: Standard server-side identity client.

---

**The Financial Settings page is the platform's commercial control panel, allowing PitchSide to pivot its revenue model (from Fixed to Hybrid) instantly across the entire facility network.**