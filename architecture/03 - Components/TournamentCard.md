# 🧩 TournamentCard

**Type:** #component **Location:** `src/components/public/TournamentCard.tsx`

## 📥 Props Received

- **tournament** (object): The core competition entity, including `prize_type`, `tournament_style`, and `team_price`.
- **userId** (string, optional): The ID of the current viewer, used to determine registration status.
- **registrations** (array, optional): The list of existing entries used to calculate the viewer's specific role (Captain vs. Player).

## 🎛️ Local State & UI Logic

- **Bimodal Action Strategy**:
    - **Unregistered State**: Presents a dual CTA approach. The primary button encourages Team Creation (`pitch-accent` background), while the secondary button invites Free Agent entry (bordered style).
    - **Registered States**: Dynamically swaps the buttons for deep links to the internal **"Captain's Command Center"** or **"Player Workspace"**, ensuring a zero-friction return path for active participants.
- **Prize Pool Normalization**:
    - Implements a `getPrizeDisplay` utility that translates complex database enums (Percentage, Fixed, Physical) into high-impact marketing strings like `"70% Pool"` or `"Bragging Rights"`.
- **Sports Broadcasting Aesthetic**:
    - Features a high-contrast typography system with `italic uppercase tracking-tighter` headings.
    - Uses a `group-hover` glossy gradient overlay and an active-scaling animation (`active:scale-95`) on buttons to provide a premium, tactile feel.
- **Logistics Matrix**:
    - A 3-column scannability grid that highlights the **Prize**, **Style** (e.g., Single Elimination), and **Capacity** using consistent `lucide-react` iconography.

## 🔗 Used In (Parent Pages)

- `src/app/tournaments/page.tsx` (Global Tournament Discovery)
- `src/app/page.tsx` (Homepage "Upcoming Competitions" section)

## ⚡ Actions & API Triggers

- **`router.push()`**: Facilitates deep-linking into specialized registration funnels or management dashboards based on the user's inferred intent and role.

---

**TournamentCard is the platform's high-conversion discovery unit, designed to simplify complex competitive logistics into a premium, scannable, and actionable interface.**