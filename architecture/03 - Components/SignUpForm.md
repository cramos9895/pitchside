# 🧩 SignUpForm

**Type:** #component #identity
**Location:** `src/app/signup/page.tsx`
**Last Audited:** 2026-04-10

## 📥 Props Received
- *Note: This is a standalone client component embedded in the Signup Page.*

## 📝 Data Schema / Types
- uses `registerAccount` action from `@/app/actions/auth`.

## 🎨 Visual DNA (Layout & UI)
- **Container:** `w-full max-w-lg bg-pitch-card border border-white/10 p-8 shadow-2xl`
- **Account Toggles:** `grid grid-cols-2 gap-4 mb-8` - Custom styled buttons with `border-2` and `pitch-accent` active states.
- **Interactions:** Uses `framer-motion` style transitions (`animate-in fade-in slide-in-from-top-2`) for conditional inputs.

## 🎛️ Local State & UI Logic
- **Multi-Tenant Onboarding**: 
    - **Player Tier**: Standard registration flow.
    - **Facility Tier**: Requires `organizationName` and redirects to a `/pending` approval state.
- **Validation Engine**: Hard checks for email matches, password length, and required organization fields.
- **Role Routing**: 
    - Players go immediately to `/` (Home).
    - Facilities go to `/pending` (Approval Queue).

## 🔗 Used In (Parent Pages)
- [[Signup Page]]

## ⚡ Actions & API Triggers
- **[[registerAccount]]**: Executes the database insertion and auth creation.
