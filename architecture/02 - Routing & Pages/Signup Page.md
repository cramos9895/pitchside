# 📄 Signup Page

**Path:** `src/app/signup/page.tsx` (Account Creation Portal)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Branding Header:** Prominent "PITCHSIDE" typography that doubles as a navigational link to the homepage.
    - **Account Type Toggle ("Fork in the Road"):** A high-impact, two-button selector that allows users to identify as either a **Player** or a **Facility Owner**. The active state is highlighted with `pitch-accent` borders and a subtle glow.
    - **Adaptive Registration Form:** A dynamic form container that adjusts its fields based on the selected account type.
    - **Conditional Organization Support:** Renders an "Organization Name" input specifically for facility owners, utilizing a smooth `animate-in` entry.
    - **Validation Feedback System:** Provides real-time red alerts for front-end validation errors like non-matching emails or password length requirements.
- **Imported Custom Components:**
    
    - [[SignUpForm]]: Internal child component that encapsulates the registration state and form layout.
- **Icons (lucide-react):**
    
    - `Loader2`, `User`, `Building`
- **Buttons / Clickable Elements:**
    
    - **"I am a Player" / "Facility Owner" Buttons:** State triggers that modify the `accountType` and form structure.
    - **"Create Account" Button:** The primary form submission target; triggers the `handleAuth` function.
    - **"Sign In" Link:** A secondary navigational element allowing existing users to jump back to the `/login` flow.

## 🎛️ State & Variables

- **React State (Client-Side):**
    
    - `accountType`: A string literal (`'player' | 'facility'`) that dictates the system role for the new user.
    - `organizationName`: Captured only for `facility` accounts.
    - `fullName`, `email`, `confirmEmail`: Captured for all users (includes email confirmation logic).
    - `password`, `confirmPassword`: Standardized password inputs with confirmation validation.
    - `loading`: Manages the disabled state of the submission button and the visibility of the `Loader2` icon.
- **Account Creation Logic:**
    
    - **Client-Side Sanitization:** Checks for matching emails/passwords and trims whitespace from names before submission.
    - **Role-Based Redirection:**
        - **Facility Owners:** Routed to [[/pending]] to wait for administrative approval.
        - **Players:** Routed directly to the root homepage (`[[/]]`) for immediate access.
- **Interactions:**
    
    - **Server Action:** Uses the [[registerAccount]] server action to securely handle sensitive user creation logic.

## 🔗 Links & Routing (Outbound)

- `href="/"` (Homepage access)
- `href="/login"` (Standard sign-in path)
- `router.push('/pending')` (Facility approval path)
- `router.push('/')` (Primary player path)

## ⚡ Server Actions / APIs Triggered

- [[registerAccount]]: The core multi-step action responsible for creating the Supabase Auth user and inserting the corresponding record into the `profiles` table.
- [[Suspense]]: Ensures the UI provides a consistent fallback loading state during client-side hydration.