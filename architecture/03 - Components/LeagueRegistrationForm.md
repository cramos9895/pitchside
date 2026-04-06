# 🧩 LeagueRegistrationForm

**Type:** #component **Location:** `src/components/public/LeagueRegistrationForm.tsx`

## 📥 Props Received

- **league** (object): The parent league metadata, including `team_price` and `free_agent_price`.
- **type** ('team' | 'free_agent'): Determines the operational mode and rendered input set for the registration.

## 🎛️ Local State & UI Logic

- **Bimodal Registration Engine**:
    - **Captain Mode**: Collects `teamName`, `primaryColor` (via native hex picker), and **Payment Choice**.
    - **Free Agent Mode**: Provides a multi-select grid for position preferences (Forward, Midfield, Defense, Goalie) to populate the global draft pool.
- **Financial Liability Guard**:
    - Dynamically injects a **"Financial Liability Acceptance"** checkbox when the Team Captain selects "Split Payment".
    - This is a mandatory validation gate that ensures the captain understands they will be auto-charged any remaining roster balance at the registration cutoff.
- **Harmonized Pricing Logic**:
    - Normalizes various database naming conventions (`price_per_team`, `team_price`, `price`) into a unified local constant to ensure consistent price display regardless of the underlying schema version.
- **Visual Feedback**:
    - Employs `ShieldAlert` for high-priority validation errors and a `loading` state that disables the "Register" button to prevent double-charging or duplicate team creation.

## 🔗 Used In (Parent Pages)

- `src/app/leagues/[id]/register/page.tsx`
- `src/app/tournaments/[id]/register/page.tsx`

## ⚡ Actions & API Triggers

- **[[registerCaptain]]**: A server action that handles the atomic creation of a team record and the initial captain membership.
- **[[registerFreeAgent]]**: Dispatches the user's positional metadata to the `registrations` table as an unassigned entity.
- **`router.push` / `router.refresh`**: Manages the post-registration transition, forcing the browser to revalidate server-side props for the tournament workspace.

---

**LeagueRegistrationForm is the primary intake point for structured competition, managing the complex intersection of team branding, financial liability, and player skill-mapping.**