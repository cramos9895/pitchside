# 🧩 LegalSettingsForm

**Type:** #component **Location:** `src/components/facility/LegalSettingsForm.tsx`

## 📥 Props Received

- **initialWaiverText** (string | null): The existing liability contract text stored in the database.

## 🎛️ Local State & UI Logic

- **`waiverText`**: Controlled state for the liability document.
- **"Zero-Friction" Logic**: The form UI includes explicit instructions that an empty text area acts as a system-wide toggle to **skip waiver verification** during the checkout process, allowing facilities to choose between legal rigour or maximum conversion.
- **High-Density Editor**: Implements a large `h-96` textarea with `leading-relaxed` line-heights and a custom `form-scrollbar` to accommodate multi-page legal contracts comfortably within the web interface.
- **State Feedback**: Uses `isSaving` to provide tactile feedback by swapping the `Save` icon for a `Loader2` spinner and disabling the submission button during high-latency network calls.

## 🔗 Used In (Parent Pages)

- `src/app/admin/(dashboard)/facilities/[id]/settings/page.tsx`
- `src/app/facility/admin/settings/page.tsx`

## ⚡ Actions & API Triggers

- **[[updateFacilityWaiver]]**: A dedicated server action that processes the `FormData` to update the facility's legal metadata.
- **`useToast`**: Dispatches system-level success/error notifications to confirm that the new legal terms have been deployed to the public checkout flow.

---

**LegalSettingsForm is the platform's risk-management tool, allowing venue owners to digitize their legal requirements and enforce compliance at the point of sale.**