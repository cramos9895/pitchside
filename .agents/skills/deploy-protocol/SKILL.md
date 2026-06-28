---
name: deploy-protocol
description: Use this skill before committing, merging, or preparing to deploy/push code to remote repositories.
---

# Deploy Protocol

Before code is pushed or merged into the production branch, execute these security and environment verification checks.

## 1. Credentials & Secrets Sweep
Scan the codebase (especially the `src/` directory) for any hardcoded sensitive keys or secrets. Check specifically for:
- Stripe keys (`sk_test`, `sk_live`)
- Resend keys (`re_`)
- Supabase service role keys or client keys
- JWT strings (`eyJ`)
If any are detected, flag them and remediate immediately.

## 2. Environment Variable Isolation
- Verify that `.env.local` and all other local environment files (e.g., `.env`) are listed in `.gitignore` and are not staged for commit.
- Never use fallbacks or defaults for security-critical variables; let the system fail loudly if credentials are missing.

## 3. Deployment Commands
Provide the user with clear, step-by-step instructions to proceed:
1. **Link to Production Project:**
   ```bash
   npx supabase link --project-ref <project-ref>
   ```
2. **Push Local DB Changes:**
   ```bash
   npx supabase db push
   ```
3. **Merge to Main:**
   Verify that the target branch (usually `main`) is clean of untracked test scripts or temporary SQL files, then git merge and push.
