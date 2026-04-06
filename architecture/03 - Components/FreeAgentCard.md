# 🧩 FreeAgentCard

**Type:** #component **Location:** `src/components/FreeAgentCard.tsx`

## 📥 Props Received

- **player** (object): The detailed athlete profile including `ovr` (rating), `wins`, and `matches_played`.
- **isCaptain** (boolean): A permission flag that unlocks the "Draft" recruitment button.
- **teamsConfig** (array): The available squad assignments for the current game, used to populate the draft selection.
- **onDraft** (function): The callback that executes the transfer of the free agent to a specific team roster.

## 🎛️ Local State & UI Logic

- **Gamified Tiering Engine**:
    - Implements an automated "Scarcity Tier" system based on the `ovr` prop, altering the entire card's CSS variables, gradients, and border styles.
    - **Diamond (95+)**: Features a high-brightness `blue-900` theme and an active **Holographic Shimmer** animation via an `after:` pseudo-element.
    - **Gold/Silver/Bronze**: Progressive downgrades in visual saturation to communicate skill density at a glance.
- **FUT Physical Architecture**:
    - Uses a complex `clip-path: polygon(...)` to mimic the iconic shield shape of a physical sports trading card.
    - Includes an `inset-1` overlay border to simulate a "3D Border" effect on the card edge.
- **Recruitment Interceptor**:
    - Features a floating, high-elevation (`-top-8`) CTA button that triggers an **Assignment Modal**.
    - Captains are forced to select a specific squad from the `teamsConfig` matrix before finalizing the draft, ensuring data-integrity for match-day rosters.
- **Statistical Dashboard**:
    - Renders a 2x2 grid of calculated performance metrics (Win %, Games Played) with a large-scale position watermark (e.g., `FWD`, `GK`) for immediate archetypal identification.

## 🔗 Used In (Parent Pages)

- `src/app/free-agents/page.tsx` (Marketplace View)
- `src/components/admin/AdminGameList.tsx` (Admin Scout Mode)

## ⚡ Actions & API Triggers

- **`onDraft(bookingId, teamAssignment)`**: Dispatches the player's draft request to the server, resulting in a permanent roster insertion and a potential "Vault Capture" animation in the success state.

---

**FreeAgentCard is the platform's primary talent discovery unit, blending high-end sports gaming aesthetics with functional recruitment tools to make scouting interactive and rewarding.**