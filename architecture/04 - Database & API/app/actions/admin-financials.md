# ⚙️ admin-financials

**Type:** #api #database #financial  
**Location:** `src/app/actions/admin.ts`

## 📄 Expected Payload / Schema

- **updatePlatformFees**: `formData` (`fee_type`, `fee_percent`, `fee_fixed`).

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Master Admin Lockdown**: This action contains the platform's strictest role-gate. It verifies the authenticated user has either `system_role: 'super_admin'` or `role: 'master_admin'`. This ensures that individual facility owners or participants cannot access or modify the global platform fee structure.
- **Singleton Authority**: Utilizes `createAdminClient()` to perform updates on the `platform_settings` table. This bypasses standard user-level RLS, as the platform settings are a global, read-only resource for the rest of the application.

## 🧪 Business Logic & Math

- **The "Platform Tax" Engine**:
    - This is the **Primary Revenue Hub** of the platform. It configures the mathematical ruleset used by `[[checkout]]` and `[[processLeaguePayments]]` to calculate the final transaction amount.
- **Financial Precision Math**:
    - **Decimal-to-Cents Conversion**: Implements safe parsing for `fee_fixed`. It converts decimal UI inputs (e.g., `$2.50`) into integer **cents** (`250`) before database insertion. This is critical for maintaining 100% precision in subsequent Stripe `PaymentIntent` calculations and avoiding floating-point errors.
    - **Hybrid Fee Support**: Supports three distinct revenue models via the `fee_type` enum: `percent`, `fixed`, or a combination of `both`.
- **State Integrity**:
    - Targets the singleton record (`id: 1`) in the `platform_settings` table. This ensures the entire network of facilities and competitions operates under a unified, real-time-updatable financial policy.

## 🔄 Returns / Side Effects

- **Returns**: Standardized response `{ success: true }` on success or `{ error: string }` if validation or authority checks fail.
- **UI Synchronization**: Triggers `revalidatePath` for `/admin/settings/financials`, ensuring the "Admin Revenue Dashboard" displays the active fee structure immediately after the update.

---

**`admin-financials` is the platform's "Economic Command Center," providing the high-precision logic needed to manage and scale the global revenue model across every transaction in the ecosystem.**