# ⚙️ settings

**Type:** #api #database #utility **Location:** `src/app/actions/settings.ts`

## 📄 Expected Payload / Schema

- **getPaymentSettings**: No parameters.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Data Privacy**: Implements strict **Data Minimization** by querying only the specific keys required for the checkout UI (`payment.venmo_handle`, `payment.zelle_info`), preventing the accidental exposure of technical system configurations.

## 🧪 Business Logic & Math

- **Real-Time Instruction Engine**:
    - **Cache Termination**: Uses **`unstable_noStore()`** to forcefully bypass Next.js 13+ Data Cache. This ensures that if a facility administrator updates their Venmo handle via the Master Dashboard, participant checkouts immediately reflect the new destination without needing a manual server restart or revalidation.
    - **Key Whitelisting**: Selects configuration data based on a strict whitelist of `in('key', [...])`, providing a secure mechanism for exposing global variables to the client-side.

## 🔄 Returns / Side Effects

- **Returns**: `Array<{ key: string, value: string }>` containing the active manual payment instructions.
- **Side Effects**: None. This is a read-only configuration utility.

---

**`settings` acts as the platform's "Global Configuration Authority," providing a low-latency, high-integrity bridge for non-Stripe payment instructions and system-wide variables.**