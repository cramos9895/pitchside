# 🧩 VotingModal

**Type:** #component **Location:** `src/components/VotingModal.tsx`

## 📥 Props Received

- **candidates** (array): A list of eligible players from the match roster, including their `full_name` and `team_assignment`.
- **gameId** (string): The unique identifier for the match, used to link the vote in the database.
- **onVoteSuccess** (function): A callback to trigger parent-level UI refreshes (like showing the winning MVP card) after a valid submission.

## 🎛️ Local State & UI Logic

- **Prestige-Driven Visuals**:
    - Uses a `yellow-500/20` trophy icon and `pitch-accent` typography to position the "MVP" choice as a high-value community interaction.
- **Anti-Fraud Governance**:
    - Specifically traps Postgres error code `23505` (Unique Constraint Violation). This ensures that even if the UI fails to block a second click, the database enforces a **One Vote Per Player Per Game** policy.
- **Contextual Recall**:
    - Displays each candidate's `team_assignment` (e.g., "Team A", "Team B") within the row. This assists voters in multi-team formats where they may remember a player's performance but not necessarily their full name.
- **Tactile Selection Feedback**:
    - The active candidate row undergoes a total visual transformation: switching from a `bg-white/5` border to a full `bg-pitch-accent` solid fill with a `CheckCircle2` confirmation icon.
- **Eligiblity Guard**:
    - Includes a "No eligible candidates found" fallback state for games that were cancelled or had zero checked-in participants, preventing UI dead-ends.

## 🔗 Used In (Parent Pages)

- `src/app/games/[id]/page.tsx` (Match Lobby post-game state)
- `src/components/public/PlayerCommandCenter.tsx` (Tournament feedback phase)

## ⚡ Actions & API Triggers

- **`supabase.from('mvp_votes').insert()`**: The primary transactional mutation for recording the community's choice.
- **`onVoteSuccess()`**: Triggers a parent re-render, typically used to fetch the updated `mvp_results` view.

---

**VotingModal is the platform's primary engagement tool for post-match interaction, designed to build community prestige and recognize top-tier performance through a secure, high-contrast interface.**