# 🧩 FinancialSettingsForm

**Type:** #component **Location:** `src/components/admin/FinancialSettingsForm.tsx`

## 📥 Props Received

- **initialData** (object):
    - `id` (number)
    - `fee_type` ('percent' | 'fixed' | 'both')
    - `fee_percent` (number)
    - `fee_fixed` (number - stored in cents)

## 🎛️ Local State & UI Logic

- **`feeType`**: Active selection state that toggles between Percentage-based, Fixed-fee, or Hybrid models.
- **Visual Disabling**: Dynamically applies `opacity-30` and `pointer-events-none` to input groups that do not belong to the currently selected `feeType`, guiding user focus.
- **Currency Normalization**: On component mount, it converts the backend's integer-based cent values into human-readable dollar strings (e.g., `100` -> `1.00`).
- **Hybrid Support**: Allows simultaneous configuration of both a percentage cut and a fixed surcharge, which are summed during the checkout process.

## 🔗 Used In (Parent Pages)

- `src/app/admin/(dashboard)/settings/financials/page.tsx`

## ⚡ Actions & API Triggers

- **[[updatePlatformFees]]**: A specialized administrative server action that processes the `FormData` to update global fee logic.
- **`useToast`**: Dispatches system notifications to confirm that financial changes have been pushed to the production checkout engine.
- **`form action={handleSubmit}`**: Utilizes React 18's native form actions to handle the submission lifecycle including pending states.

---

**FinancialSettingsForm is the platform's revenue engine, allowing point-and-click control over global marketplace take-rates without requiring manual database intervention.**