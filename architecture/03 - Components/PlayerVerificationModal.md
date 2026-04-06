# 🧩 PlayerVerificationModal

**Type:** #component **Location:** `src/components/admin/PlayerVerificationModal.tsx`

## 📥 Props Received

- **player** (object): The profile or booking record for the individual being vetted.
- **mode** ('global' | 'match'):
    - `global`: Terminal-style entry verification for the facility.
    - `match`: Roster-level activation for a specific game or league.
- **strictWaiverRequired** (boolean): If true, blocks the "Verify" action unless a digital or physical waiver is on file.
- **onPhotoUpload** (function): Handles the persistence of newly captured ID photos.

## 🎛️ Local State & UI Logic

- **Live Camera Pipeline**:
    - **`cameraActive`**: Activates the hardware camera via `navigator.mediaDevices.getUserMedia`.
    - **Frame Capture**: Utilizes a hidden `<canvas>` element to freeze and rasterize video frames into compressed JPEG blobs for server-wide profile association.
- **Compliance Dashboard**:
    - Provides a high-contrast visual readout of **Waiver Status** (Digital vs. Physical) and **Payment Status** (Stripe Verified).
- **Manual Waiver Override**:
    - Enables a "Paper Waiver Received" bypass workflow for administrators when digital signatures are unavailable, updating the `has_physical_waiver` flag.
- **Massive Action Button**:
    - Employs a "Tablet-First" design with an oversized 2XL button for high-throughput check-ins, changing color from `pitch-accent` (Verify) to `red-500/10` (Undo) based on the player's presence state.

## 🔗 Used In (Parent Pages)

- `src/app/facility/operations/page.tsx` (The primary Kiosk/Tablet interface)
- `src/app/admin/(dashboard)/users/page.tsx` (For manual profile corrections)

## ⚡ Actions & API Triggers

- **[[onCheckIn]]**: Dispatches a database update (via `bookings` or `profiles`) to timestamp the player's arrival.
- **[[onPhotoUpload]]**: Streams binary ID data to Supabase Storage, updating the player's `avatar_url` or `verification_photo_url`.
- **[[onWaiverOverride]]**: A high-privilege mutation used to manually certify a player's legal eligibility.

---

**PlayerVerificationModal is the platform's primary security and logistics gate, designed for high-speed tablet interaction in high-traffic sports facilities.**