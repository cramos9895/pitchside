# 📄 Login Page

**Path:** `src/app/login/page.tsx` (Authentication Portal)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Branding Header:** Features the primary "PITCHSIDE" typography with an integrated link for returning to the landing page.
    - **Login Card:** A high-contrast container for the authentication form, utilizing a `pitch-card` background and subtle border.
    - **Background Aesthetics:** Implements a fixed-position radial glow (`bg-pitch-accent/5`) to provide depth behind the form.
    - **Authentication Form:** Standard input group for gathering player credentials (`email` and `password`).
    - **Error Alert Box:** A conditionally rendered red alert that surfaces specific error messages (e.g., "Invalid login credentials") from Supabase Auth.
- **Imported Custom Components:**
    
    - [[LoginForm]]: An internal child component used to encapsulate the form logic and state.
- **Icons (lucide-react):**
    
    - `Loader2` (Used as a spinner on the submission button during `loading` state).
- **Buttons / Clickable Elements:**
    
    - **"Enter the Pitch" Button:** The primary submission trigger that executes the `handleAuth` function.
    - **"Forgot Password?" Link:** A secondary navigational link routing users to `/forgot-password`.
    - **"Sign Up" Link:** A call-to-action for new users to navigate to the `/signup` route.

## 🎛️ State & Variables

- **React State (Client-Side):**
    
    - `email`: Captures the user's email address.
    - `password`: Captures the user's account password (minimum 6 characters).
    - `loading`: A boolean flag used to disable the form and show a spinner during active authentication requests.
    - `error`: A string or null value used to store and display feedback from the authentication attempt.
- **Routing & Redirection Logic:**
    
    - **Portal Selection:** Upon a successful sign-in, the system performs a lookup on the `profiles` table.
    - **Admin Redirect:** If the user's `system_role` is identified as `facility_admin` or `super_admin`, they are redirected to the `/facility` dashboard.
    - **Standard Redirect:** All other users are automatically returned to the root homepage (`/`).
- **Database Queries (Client-Side):**
    
    - **Authentication:** [[supabase.auth.signInWithPassword]] to verify user credentials.
    - **Role Verification:** A single-row query on the `profiles` table targeting the authenticated user's `id` to determine `system_role`.

## 🔗 Links & Routing (Outbound)

- `href="/"` (Return to Home)
- `href="/forgot-password"` (Internal route)
- `href="/signup"` (Internal route)
- `router.push('/facility')` (Conditional programmatic redirect)
- `router.push('/')` (Standard programmatic redirect)

## ⚡ Server Actions / APIs Triggered

- [[createClient]] (Instantiates the client-side Supabase connection)
- [[Suspense]]: Wraps the [[LoginForm]] to ensure smooth hydration and fallback handling during initial load.