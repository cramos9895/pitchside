# 🏅 FieldProjector

**Type:** #page / #projector **Location:** `src/app/admin/matches/[match_id]/display/page.tsx`

## 🎛️ Local State & UI Logic

- **God-Scale Visual Hierarchy**:
    - This projector is engineered for extreme distance legibility from across a soccer pitch or court. It uses massive, center-aligned typography (`text-[22rem]`) for live scores and bold, high-contrast team names.
- **Phase-Aware Countdown Logic**:
    - The timer is intelligent. Instead of a simple count-up, it determines the remaining time based on the active `match_phase` (e.g., First Half, Halftime, Second Half).
    - It re-bases its calculations against the parent game's configured `half_length` or `halftime_length`, ensuring the countdown reflects the official match rules.
- **Transactional State Persistence**:
    - Uses a `paused_elapsed_seconds` and `timer_started_at` combination to calculate `displayTime`. This architecture allows the clock to be paused, resumed, or adjusted by an official without ever losing total accrued match time.
- **Playoff Placeholder Logic**:
    - Handles dynamic tournament seeding. If a team is not yet decided (e.g., "Winner Match #42"), the component renders a "TBD" state with a muted, italicized gray font to distinguish it from officially registered teams.
- **Visual Heartbeat (Sync Feedback)**:
    - Beneath the central timer, the projector features a high-speed, CSS-animated scanning bar (`animate-scan`). This provides immediate visual confirmation to players and referees that the display is actively receiving data from the score server.
- **Immersive Branding**:
    - Includes a localized branding cluster that identifies the specific playing field or court (e.g., "Field 1 Broadcast"), creating a professional tournament atmosphere.

## 🔗 Used In (Navigation)

- Accessed via the unique match URL `/admin/matches/[match_id]/display`.
- Typically deployed on tablets mounted to field posts or large LED scoreboards.

## ⚡ Actions & API Triggers

- **`fetchData()`**: Syncs every 10 seconds or immediately upon a Supabase `UPDATE` event for the current match ID.
- **Timer Heartbeat**: A 1-second local JS interval that interpolates the server-side timestamp for a smooth, high-frame-rate clock display.

---

**FieldProjector is the "Ultimate Scoreboard Interface," bridging the gap between high-pressure on-field action and secondary spectator consumption.**