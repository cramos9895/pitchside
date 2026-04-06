# 📄 Pending Verification Page

**Path:** `src/app/pending/page.tsx` (Facility Owner Holding Page)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Verification Holding Card:** A high-fidelity, translucent card (`bg-pitch-card/80 backdrop-blur-xl`) designed to provide a professional waiting experience for facility owners awaiting approval.
    - **Status Branding:** Features a custom-styled orange `ShieldAlert` icon with a radial glow to signify that the account is currently in a restricted "Under Review" state.
    - **Header & Messaging:** A clear, uppercase italic heading ("Account Under Review") followed by a descriptive block explaining the manual verification process.
    - **Instructional Footer:** A dedicated UI block that sets expectations for email notification upon account activation.
    - **Atmospheric Background:** Deep-layered radial blurs (`pitch-accent` and `blue-500`) that provide visual consistency with the landing and login pages.
- **Imported Custom Components:**
    
    - _(Note: This page is built as a standalone Server Component to prioritize security and immediate redirection logic)._
- **Icons (lucide-react):**
    
    - `LogOut`, `ShieldAlert`
- **Buttons / Clickable Elements:**
    
    - **"Sign Out / Use Different Account" Button:** A secondary styled button wrapped in a server action form to allow users to exit the holding state.

## 🎛️ State & Variables

- **Server-Side Logic:**
    
    - **Bypass Validation:** If the database indicates the user is already `verified`, the page executes an immediate [[redirect]] to the homepage, ensuring that valid users are never trapped in the pending state.
    - **Auth Enforcement:** Strictly verifies the existence of a session via `[[supabase.auth.getUser]]` before attempting to render the state.
- **Database Queries (Server-Side):**
    
    - **Verification Status Check:** Performs a [[single]] row query on the `profiles` table to retrieve only the `verification_status` field for the active user.

## 🔗 Links & Routing (Outbound)

- `redirect('/login')` (Triggered if unauthenticated)
- `redirect('/')` (Triggered if the user is already verified)
- `redirect('/login')` (Triggered after a successful sign-out action)

## ⚡ Server Actions / APIs Triggered

- [[createClient]] (Instantiates the server-side Supabase connection)
- [[signOutUser]]: A dedicated **'use server'** function that handles the secure termination of the Supabase session from within the holding page.
- [[supabase.auth.signOut]]: The core method for clearing the user's authentication cookies.