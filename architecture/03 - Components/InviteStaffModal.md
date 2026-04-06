# 🧩 InviteStaffModal

**Type:** #component **Location:** `src/components/facility/InviteStaffModal.tsx`

## 📥 Props Received

- _None (Self-contained trigger and modal)._

## 🎛️ Local State & UI Logic

- **`isOpen`**: Manages the portal-style visibility of the invitation interface.
- **Micro-Interactive Trigger**: The entry button features a `hover:-translate-y-1` lift effect and a specialized `pitch-accent` glow shadow to draw attention.
- **State-Aware Inputs**:
    - Disables the email input and submit button during the `loading` phase.
    - Implements a **Success-Cooldown** where the modal remains open for 2 seconds after a successful invite to show a confirmation message before automatically resetting and closing.
- **User Linking Logic**: Transparently handles both new user invitations and the linking of existing PitchSide accounts to the facility's administrative roster.

## 🔗 Used In (Parent Pages)

- `src/app/facility/admin/team/page.tsx`
- `src/app/admin/(dashboard)/facilities/[id]/team/page.tsx`

## ⚡ Actions & API Triggers

- **[[inviteFacilityStaff]]**: A server-side action that:
    1. Validates the email format.
    2. Checks for existing user profiles.
    3. Issues a facility-linked invite or direct role escalation in the `profiles` table.
- **`setTimeout`**: Orchestrates the automated post-success UI reset.

---

**InviteStaffModal is the primary growth tool for facility operations, allowing owners to securely expand their administrative team in seconds.**