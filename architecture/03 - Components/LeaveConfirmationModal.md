# 🧩 LeaveConfirmationModal

**Type:** #component **Location:** `src/components/public/LeaveConfirmationModal.tsx`

## 📥 Props Received

- **tournamentTitle** (string): The name of the competition, used for contextual confirmation in the body text.
- **isProcessing** (boolean): Tracks the async deletion state to provide visual feedback and prevent multiple clicks.
- **onConfirm** (function): The callback that triggers the backend removal logic.

## 🎛️ Local State & UI Logic

- **Destructive Action Palette**:
    - Employs a consistent `red-500` and `red-600` design system to visually differentiate this from constructive actions like "Drafting" or "Registering".
- **Business Rule Transparency**:
    - Features a high-visibility alert box stating that **"This may not trigger an automatic refund"**. This is a crucial defense against customer support disputes, as refund windows are typically managed by the facility and Stripe, not the player-facing UI.
- **Consequence Education**:
    - Explicitly details that the user will be removed from both the **Team Roster** and the **Draft Pool**, ensuring they understand the total loss of participation for that specific event ID.
- **Refined Exit Strategy**:
    - Provides a "Nevermind" option with low-contrast styling (`white/5`) to psychologically encourage the user to reconsider the destructive action.
- **Loading Integrity**:
    - Uses the `isProcessing` prop to swap the button text to "Removing Registration..." and apply a `disabled` state, ensuring a single, valid request is sent to the Supabase backend.

## 🔗 Used In (Parent Pages)

- `src/components/public/PlayerCommandCenter.tsx`

## ⚡ Actions & API Triggers

- **`onConfirm()`**: Executes the `leaveTournament` server action, which cleans up the many-to-many relationship in the `registrations` table and potentially triggers a refund webhook.

---

**LeaveConfirmationModal acts as the final "Safety Catch" before a user withdraws from a competition, primarily focused on education regarding non-refundable fees and roster implications.**