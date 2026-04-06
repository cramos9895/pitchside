## 📥 Props Received

- **facilityId** (string, optional): If present, the modal dynamically re-wraps the legal text to prioritize the specific venue's liability over the general Pitch Side platform terms.
- **loading** (boolean): Disables the agreement button and shows a spinner while the digital signature is being persisted to Supabase.
- **onAgree** (function): The critical callback that marks the user as "Verified" and allows them to proceed to the payment/roster phases.

## 🎛️ Local State & UI Logic

- **Polymorphic Legal Scoping**:
    - Implements a conditional string-interpolation engine that swaps occurrences of "Pitch Side" with "This Facility." This allows host venues to stay legally compliant within the global Pitch Side ecosystem without requiring bespoke modal builds for every location.
- **High-Alert Legal Architecture**:
    - Employs a `black/90` backdrop and `backdrop-blur-md` to create a "High-Friction" interface. This is a deliberate UX choice intended to ensure users recognize the gravity of the legal release they are about to sign.
- **Clausular Decomposition**:
    - Rather than presenting a wall of text, the component breaks the agreement into five indexed sections:
        1. **Assumption of Risk** (The Physical Danger)
        2. **Release of Liability** (The Waiver)
        3. **Medical Consent** (Emergency Permission)
        4. **Media Release** (Marketing Rights)
        5. **Code of Conduct** (Governance)
- **Digital Signature Guard**:
    - The "I AGREE TO THESE TERMS" button is styled as a large, high-contrast CTA with a `shadow-pitch-accent/20` glow, ensuring it is the undeniable focal point of the modal once the user has scrolled through the content.
- **Mobile-Optimized Scroller**:
    - Uses a `max-h-[90vh]` constraint with an internal `overflow-y-auto` container, preventing the legal text from pushing the "Agree" button off-screen on smaller devices.

## 🔗 Used In (Parent Pages)

- `src/components/JoinGameModal.tsx` (Tournament/Pickup entry gate)
- `src/components/public/PublicBookingModal.tsx` (Facility rental gate)

## ⚡ Actions & API Triggers

- **`onAgree()`**: Typically triggers a Supabase `update` to the `profiles` table or an `insert` into a specialized `agreements_log` to create a permanent audit trail of the user's consent.

---

**WaiverModal serves as the platform's primary risk-mitigation layer, providing a secure and auditable method for collecting digital signatures before any physical or financial participation occurs.**