# 🧩 LeagueRowActions

**Type:** #component **Location:** `src/components/facility/LeagueRowActions.tsx`

## 📥 Props Received

- **leagueId** (string): The unique identifier for the targeted league.

## 🎛️ Local State & UI Logic

- **`e.stopPropagation()`**: Implements a click-propagation interceptor to ensure that clicking these specific action buttons does not trigger the base `onClick` handler of the parent table row (which usually navigates to a high-level view).
- **Dual-Action Workflow**:
    - **Manage**: A high-visibility `pitch-accent` button designed for high-frequency operational tasks like roster management and result processing.
    - **Settings**: A lower-contrast `white/5` icon button (Gear) intended for low-frequency structural adjustments to the league’s foundational rules and pricing.
- **Z-Indexing Integration**: Explicitly sets `z-10` and `relative` to ensure the buttons remain interactive even if placed within complex row layouts or nested overlays.

## 🔗 Used In (Parent Pages)

- `src/app/facility/admin/leagues/page.tsx`
- `src/app/admin/(dashboard)/leagues/page.tsx`

## ⚡ Actions & API Triggers

- **`router.push`**: Facilitates client-side navigation to the management or edit views, providing a zero-refresh interaction for facility administrators.

---

**LeagueRowActions is the primary interaction point for listing competition data, providing granular control over individual tournaments and leagues within unified table structures.**