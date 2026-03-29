# User Policy & Development Guidelines

This document outlines the strict operational and coding standards for the PitchSide project. These rules are prioritized to ensure non-destructive development, clear communication with a non-technical user, and high-quality UI/UX.

## 1. Non-Technical Communication & Documentation
- **Code Comments:** Always include easy-to-understand, plain-English comments in all code changes. Explain *what* the code does and *why*, avoiding overly dense technical jargon.
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
