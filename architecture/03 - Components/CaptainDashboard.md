# 🧩 CaptainDashboard

**Type:** #component **Location:** `src/components/public/CaptainDashboard.tsx`

## 📥 Props Received

- **team** (object): The physical team record, including branding (`primary_color`) and recruitment status.
- **tournament** (object): The parent competition rules, including pricing and fee configurations.
- **roster** (array): The list of confirmed players already signed to the team.
- **freeAgents** (array): The global pool of unassigned players available for drafting.

## 🎛️ Local State & UI Logic

- **Viral Invite Engine**:
    - Generates a unique, persistent recruitment URL (`/invite/[team_id]`) designed for high-conversion sharing in messaging apps (WhatsApp, iMessage).
    - Features a tactile "Copy" feedback loop with temporary success states.
- **Adaptive Financial Tracker**:
    - **Dynamic Balance Calculation**: Subtracts both student payments and **Free Agent Credits** from the global team fee.
    - **Recruitment Incentive**: The UI explicitly highlights "FA Credits"—monetary rewards deducted from the captain's balance for every free agent they rescue from the draft pool.
    - **Funding Progress**: A high-impact visual bar showing the percentage of the team fee covered to date.
- **Draft Board (Scout Interface)**:
    - A specialized sub-view for browsing the competition's `freeAgents` pool.
    - Features a **Toggle Switch** for `accepting_free_agents`, allowing the captain to signal to the system when their roster is full.
- **Brand Identity Mapping**:
    - Dynamically styles the primary dashboard header border using the `team.primary_color`, providing immediate psychological ownership of the workspace.

## 🔗 Used In (Parent Pages)

- `src/app/leagues/[id]/captain/page.tsx`
- `src/app/tournaments/[id]/captain/page.tsx`

## ⚡ Actions & API Triggers

- **[[toggleAcceptingFreeAgents]]**: A server-side mutation that updates the team's visibility in the public marketplace.
- **[[draftFreeAgent]]**: A multi-table transaction that:
    1. Validates team capacity.
    2. Removes the player from the global draft pool.
    3. Links the player to the captain's `team_id`.
- **[[DraftConfirmationModal]]**: A safety-interceptor that forces the captain to confirm financial or roster additions.

---

**CaptainDashboard is the platform's primary retention engine, empowering team leaders to manage finances, viral growth, and talent recruitment in a single high-performance interface.**