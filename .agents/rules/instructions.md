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

## 5. The Architecture Protocol
    Our system architecture is documented in the /architecture directory using Obsidian Markdown formatting.

    Context Gathering: Before proposing architectural changes or bug fixes, you MUST search the /architecture folder for the relevant [[Component]] or [[API]] to understand the existing routing and state.

    Auto-Updating: If you execute a change that alters a database schema, adds a new component, or changes a route, you MUST update the corresponding .md file in the /architecture directory to reflect the new architecture. Maintain the existing template formatting and [[Wikilink]] syntax.

## 6. Quota & Efficiency Protocols
- **Targeted Reading:** Only read files absolutely necessary for the current task. Avoid listing full directories if the target path is already known.
- **The "Reference Check":** Always state which `architecture` files you are following at the start of a task (e.g., "I am referencing [[GameCard.md]]").
- **The Backlink Protocol:** For every complex file edited, ensure a single-line comment exists at the top: `// 🏗️ Architecture: [[NoteName.md]]`. This bridges the gap between code and documentation.
- **Plan "Lite":** For "Trivial Fixes" (typos, CSS color tweaks, single-line logic fixes), you may skip the formal Implementation Plan and proceed directly to execution to save turns and quota.
- **Session Handoff:** At the end of a major task, provide a brief "Technical Delta" summary that can be used to re-index knowledge in future sessions.

## 7. Migration & Database Standards
- **No Root SQL Files:** All database changes (schema updates, RLS policy changes, seeds) MUST be placed in `./supabase/migrations/`.
- **Naming Convention:** Use the standard Supabase timestamp format: `YYYYMMDDHHMMSS_description.sql`.
- **Atomic Migrations:** Ensure each migration is a complete, runnable unit of change.

## 8. Security & Safety Guardrails
- **The "Wall of RLS":** PROHIBITED from proposing database schema changes without an accompanying RLS (Row Level Security) policy.
- **Auth-by-Default:** Every new route, API, or Server Action MUST include an explicit check for a valid user session.
- **Environment Isolation:** NEVER hardcode keys, secrets, or sensitive IDs. Use environment variables and verify their existence before use.
- **Pre-Push Security Audit:** Before requesting permission to push or merge, providing a brief "Security Audit" summary is REQUIRED (e.g., "Verified RLS, Verified Auth, No Hardcoded Keys").
- **Strict Typing:** Use strict TypeScript (avoid `any`) to prevent runtime errors in production.