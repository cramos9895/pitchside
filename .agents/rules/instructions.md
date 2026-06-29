---
trigger: always_on
---

# User Policy & Development Guidelines

This document outlines the strict operational and coding standards for the PitchSide project. These rules are prioritized to ensure non-destructive development, clear communication with a non-technical user, and high-quality UI/UX.

## 1. Non-Technical Communication & Documentation
- **Code Comments:** Always include easy-to-understand, plain-English comments in all code changes. Explain *what* the code does and *why*, avoiding overly dense technical jargon.
- **The Tester Snippet:** At the end of every major task, provide a clear, step-by-step verification guide that a non-technical user can follow in their browser to verify the change.
- **Implementation Plans:** BEFORE making any changes, generate a detailed Implementation Plan. It must explain the proposed changes, the rationale behind them, and how they will be verified. Wait for user approval before proceeding.
- **Walkthroughs:** AFTER every major change, create a Walkthrough artifact. Detail the steps taken, the results achieved, and include media (screenshots/recordings) if applicable.

## 2. Non-Destructive Development
- **Feature Preservation:** NEVER make updates that break or overwrite existing features.
- **Copy & Modify Pattern:** If a new feature is similar to an existing one (e.g., a new type of `GameCard`), do not modify the original. Instead, **copy the existing component** into a new file and modify the copy specifically for the new use case. This ensures the original remains stable.
- **Component Isolation Rules:**
    - **No Shared Component Helpers:** Copied components must keep their specific helpers, types, or hooks self-contained in their own file to prevent side effects.
    - **Separate Components Over Flags:** Avoid combining distinct user roles or layouts into one component via conditional rendering (e.g., do not use `isAdmin ? <GameCard admin /> : <GameCard />`). Create standalone components (e.g., `GameCardAdmin.tsx` and `GameCardPlayer.tsx`) and serve them on their respective pages.
    - **Naming Convention:** Use clear descriptive suffixes for component variants (e.g., `GameCardHost`, `GameCardGuest`).
- **Tech Stack Consistency:** Stick to the established tech stack:
    - **Frontend:** Next.js (App Router), React, Tailwind CSS.
    - **Backend/DB:** Supabase (Auth, DB, Storage).
    - **Email:** Resend (Hosted Templates).
    - **Payments:** Stripe.

## 3. Workflow Restrictions
- **No Internet Without Permission:** Do not use the `search_web` or `read_url_content` tools unless explicitly asked or required for a specific research task.
- **No Unsolicited Pushes:** Do not `merge` or `push` changes to the remote repository (e.g., GitHub, Vercel) without explicit permission from the user.
- **Safety First:** Always use the `diagnostics` or `debug` patterns before assuming an environment fix (e.g., checking environment variables before changing code).

## 4. UI/UX Standards & Aesthetics
- **Brand Identity:** Adhere strictly to the PitchSide color palette:
    - **Primary Black (`--color-pitch-black`):** `#0a0a0a` (Deep charcoal background).
    - **Card Gray (`--color-pitch-card`):** `#171717` (Used for containers and sections).
    - **Electric Volt (`--color-pitch-accent`):** `#ccff00` (Main action/highlight color).
    - **Muted Gray (`--color-pitch-secondary`):** `#a3a3a3` (For secondary text/icons).
- **Typography:** 
    - **Headings:** Oswald (Bold/Condensed).
    - **Body:** Inter (Clean sans-serif).
- **Premium Feel (No Gradients):** 
    - **DO NOT Use Gradients:** Avoid gradients as they can feel overdone or "too AI."
    - **Clean & Flat:** Focus on a clean, premium, high-contrast look using solid brand colors.
    - **Polished Details:** Use subtle borders, consistent spacing, and high-quality typography to achieve a "premium" feel without relying on visual gimmicks.

## 5. Quota & Efficiency Protocols
- **Targeted Reading:** Only read files absolutely necessary for the current task. Avoid listing full directories if the target path is already known.
- **Plan "Lite":** For "Trivial Fixes" (typos, CSS color tweaks, single-line logic fixes), you may skip the formal Implementation Plan and proceed directly to execution to save turns and quota.
- **Session Handoff:** At the end of a major task, provide a brief "Technical Delta" summary that can be used to re-index knowledge in future sessions.

## 6. Migration & Database Standards
- **No Root SQL Files:** All database changes (schema updates, RLS policy changes, seeds) MUST be placed in `./supabase/migrations/`.
- **Naming Convention:** Use the standard Supabase timestamp format: `YYYYMMDDHHMMSS_description.sql`.
- **Atomic Migrations:** Ensure each migration is a complete, runnable unit of change.

## 7. Platform Core Workflows
- **Booking Flow Sequence:** Slot reservations must only be confirmed *after* Stripe webhook confirmation (`checkout.session.completed`). The DB insert of the booking and decrementing of the game slot must be executed in a single database transaction.
- **Roster & Check-in:** Roster check-ins should update an `arrived` flag in the DB and must trigger a Supabase Realtime broadcast to update active host screens in real time.
- **Team Selection:** Drag-and-drop team divisions must persist assignments directly to the database via a `team` column (e.g., `'A'`, `'B'`, or `null`).

## 8. Security & Safety Guardrails
- **The "Wall of RLS":** PROHIBITED from proposing database schema changes without an accompanying RLS (Row Level Security) policy.
- **Auth-by-Default:** Every new route, API, or Server Action MUST include an explicit check for a valid user session.
- **RBAC Enforcement:** Any route or action prefixed with `/admin`, `/host`, or modifying system parameters must verify the authenticated user's role matches `admin` or `host` in the database profile table.
- **Environment Isolation:** NEVER hardcode keys, secrets, or sensitive IDs. Use environment variables and verify their existence before use.
- **Pre-Push Security Audit:** Before requesting permission to push or merge, providing a brief "Security Audit" summary is REQUIRED (e.g., "Verified RLS, Verified Auth, No Hardcoded Keys").
- **Strict Typing:** Use strict TypeScript (avoid `any`) to prevent runtime errors in production.
- **Build Verification:** Proposing file changes is only complete after running local checks (`npx tsc --noEmit` or `npm run build`) to ensure the codebase compiles cleanly.

## 9. Git & Security Operations
- **Pre-Push Sweep:** EVERY git push must be preceded by a mandatory credentials sweep.
    - Check for: `sk_test`, `sk_live`, `re_`, `eyJ` (JWT), and Supabase service role keys.
    - If detected, remediative actions must be taken IMMEDIATELY before staging.
- **Environment Verification:** Explicitly verify that all `.env` files are ignored by `.gitignore` before every push. 
- **Loud Failure Principle:** Avoid fallbacks or defaults for security-critical environment variables (e.g., Stripe Secret Keys). The system should fail loudly if credentials are missing rather than operating in a potentially insecure or mocked state.
- **Merge Hygiene:** Ensure the target branch (usually `main`) is clean of all untracked test scripts or temporary SQL files before merging.
## 10. Knowledge Base: Component Mapping
- **Tournaments (Full Event):** If the `event_type === 'tournament'`, the entire scheduling and match logic is handled by `src/components/admin/MicroTournamentManager.tsx`. This includes generating brackets/groups, handling playoffs, and inline match editing.
- **Pickup Tournaments (Match Style):** If the `event_type === 'pickup'` but `match_style === 'Tourney'`, the logic is split:
    - **Scheduling:** `src/components/admin/ScheduleGenerator.tsx` handles generating the Most Rested First round-robin schedule and team exclusions.
    - **Match Management:** `src/components/admin/MatchManager.tsx` handles displaying the matches, live scoring, and inline match editing for scheduled matches.
