# 🧩 DraftConfirmationModal

**Type:** #component **Location:** `src/components/public/DraftConfirmationModal.tsx`

## 📥 Props Received

- **player** (object): The profile of the individual being drafted, used to display their name for final verification.
- **isProcessing** (boolean): Controls the loading state of the primary button to prevent duplicate drafting requests.
- **onConfirm** (function): The callback that executes the actual roster insertion logic.

## 🎛️ Local State & UI Logic

- **Permanent Action Guard**:
    - The modal is strategically designed to communicate a **strict platform constraint**: _Once a captain drafts a player, they lose the authority to remove them._
    - This "Permanent Action" alert (styled with `orange-500` tones) is a key governance feature intended to protect players from being drafted and then immediately discarded by inconsistent captains.
- **Transactional Safety**:
    - Disables both the **Confirm** and **Cancel** paths while `isProcessing` is true, ensuring the database transaction completes without user interruption.
- **Tactile Transitions**:
    - Employs a `zoom-in-95` entrance and `active:scale-95` button interactions to maintain the high-end, responsive feel present across the PitchSide ecosystem.
- **Contextual Reassurance**:
    - Displays the player's full name in a bolded `text-white` span within the body text to eliminate "Click Error" mistakes during high-speed drafting sessions.

## 🔗 Used In (Parent Pages)

- `src/components/public/CaptainDashboard.tsx`

## ⚡ Actions & API Triggers

- **`onConfirm()`**: Triggers the parent-level `draftFreeAgent` server action, which moves the player from the global draft pool to a specific team roster.

---

**DraftConfirmationModal serves as a critical legal/operational gate, ensuring that team captains understand the long-term roster implications of their recruitment decisions.**