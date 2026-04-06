# ⚙️ payments-utility

**Type:** #api #database #financial  
**Location:** `src/app/actions/payments.ts`

## 📄 Expected Payload / Schema

- **validatePromoCode**: `code` (String), `facilityId` (UUID | Optional).

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **String Normalization**: Implements an automated cleaning layer. The action converts the `code` to uppercase and strips all whitespace before querying. This prevents users from "gaming" the validation with slight formatting variations (e.g., `off50` vs. `OFF 50`).
- **Data Minimization**: Although it returns the `promo` object, it does so within a server-side context where the sensitive `id` and `current_uses` are kept for internal logic calculations rather than direct client-side consumption.

## 🧪 Business Logic & Math

- **The "Two-Tier" Scoping Engine**:
    - This utility is the platform's **Primary Loyalty Gate**. It supports two distinct operational modes:
        1. **Standardized Rental Path**: If a `facilityId` is provided (e.g., for a private field rental), the engine _strictly_ filters the query to that specific venue, ensuring a "Tenant's Discount" cannot be leaked to other facilities.
        2. **Global Platform Path**: If the `facilityId` is null (e.g., for global pickup games), it only validates codes where `facility_id IS NULL`.
- **Validation Execution Chain**:
    - Before authorizing a deduction, the utility executes three sequential checks:
        1. **The Clock Check**: Comparing `expires_at` against the current server time.
        2. **The Capacity Check**: Validating `max_uses` against the atomic `current_uses` counter.
        3. **The ID Audit**: Ensuring the code exists in the database before any mathematical deductions are performed by the caller (`[[checkout]]` or `[[join]]`).

## 🔄 Returns / Side Effects

- **Returns**: Standardized response `{ promo }` containing the full row data on success, or `{ error: string }` if validation fails.
- **Side Effects**: None. This is a read-only utility. The actual "Redemption" (incrementing `current_uses`) is handled by the high-authority writing actions like `[[stripe]]` or `[[public-booking]]`.

---

**`payments-utility` is the platform's "Discount Validator," providing the centralized, context-aware logic needed to enforce financial promotions and venue-specific loyalty rules across the entire checkout ecosystem.**