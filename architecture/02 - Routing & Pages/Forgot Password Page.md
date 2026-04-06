# 📄 Forgot Password Page

**Path:** `src/app/forgot-password/page.tsx` (Password Recovery Portal)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Secondary Navigation:** A "Back to Sign In" link positioned at the top of the card to allow users to exit the recovery flow quickly.
    - **Recovery Form Card:** A centralized `pitch-card` containing the email submission logic, styled with a high-depth shadow (`shadow-2xl`).
    - **Icon-Enhanced Input:** The email field features an absolute-positioned `Mail` icon within the input container for improved scannability.
    - **Feedback Alerts:**
        - **Success Alert:** Renders in `pitch-accent` (Greenish) when the reset link is successfully dispatched.
        - **Error Alert:** Renders in red when the request fails (e.g., invalid email format).
- **Imported Custom Components:**
    
    - _(Uses standard Lucide icons and Tailwind-on-HTML elements for the core UI)._
- **Icons (lucide-react):**
    
    - `Loader2`, `Mail`, `ArrowLeft`
- **Buttons / Clickable Elements:**
    
    - **"Back to Sign In" Link:** Navigates the user back to the primary `/login` route.
    - **"Send Reset Link" Button:** Triggers the `handleReset` function; includes a loading state spinner.

## 🎛️ State & Variables

- **React State (Client-Side):**
    
    - `email`: Captures the player's recovery email address.
    - `loading`: Prevents double-submission and displays the loading icon during the background request.
    - `message`: Stores the success notification received from the Supabase Auth server.
    - `error`: Stores any connectivity or validation error messages returned by the catch block.
- **Recovery Redirect Logic:**
    
    - **URL Composition:** Dynamically generates a `redirectTo` URL that points to [[/auth/callback]]. This URL is appended with search parameters (`next=/update-password` and `type=recovery`) to ensure the user is correctly funneled into the password change interface once their email session is verified.
- **Database Queries (Client-Side):**
    
    - **Auth Request:** [[supabase.auth.resetPasswordForEmail]] initiates the secure email delivery flow via Supabase.

## 🔗 Links & Routing (Outbound)

- `href="/login"` (Standard navigation)
- redirectTo: [[/auth/callback]] (Complex programmatic redirect for email link verification)

## ⚡ Server Actions / APIs Triggered

- [[createClient]] (Instantiates the client-side Supabase connection)
- [[new URL(window.location.origin)]] (Standardizing the redirect base to match the current environment)