# 📄 Profile Page

**Path:** `src/app/profile/page.tsx` (User Career & Player Card)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Career Header:** Simple navigation bar containing a "Back to Pitch" link.
    - **FIFA Card Container:** The centerpiece of the profile. A highly stylized, responsive card that mimics a FIFA Ultimate Team card. It features:
        - **Dynamic Tiering:** Automatically switches between Bronze, Silver, Gold, and Diamond styles based on the user's Overall Rating (OVR).
        - **Holographic Effects:** Generates CSS-based shimmer animations for high-tier (Silver+) players.
        - **Stat Shield:** Renders the OVR and position in a floating badge.
    - **Career Stats Section:** A quick-glance grid showing total "APPS" (Appearances) and "WINS".
    - **Match History Section:** A chronological feed of previous results, utilizing color-coded indicators for Wins (Green), Losses (Red), and Draws (Gray).
- **Imported Custom Components:**
    
    - _(The profile page primarily uses raw Tailwind and Lucide icons to construct its unique FIFA-style UI rather than standard site-wide cards)._
- **Icons (lucide-react):**
    
    - `ArrowLeft`, `Edit2`, `Save`, `Trophy`, `Loader2`, `Upload`, `Camera`, `Shield`, `User`, `Settings`
- **Buttons / Clickable Elements:**
    
    - **"Back to Pitch" Link:** Triggers navigation to the Home page (`/`).
    - **FIFA Card (Interactive):** Features a scale transformation and shimmer trigger on hover.

## 🎛️ State & Variables

- **React State (Client-Side):**
    
    - `loading`: Controls the data-fetching spinner.
    - `user`: Stores the authenticated user object.
    - `profile`: Stores user profile data including `full_name`, `avatar_url`, `position`, and `bio`.
    - `bookings`: An array of match records joined with game metadata and result data.
    - `stats`: An object holding the derived `caps`, `wins`, `draws`, and `losses`.
- **Core Rating Logic:**
    
    - **"Slow Burn" OVR Calculation:** A custom algorithm that starts at a base rating of 70 and applies diminishing returns (growth penalties) as the player progresses towards 99.
    - **Result Identification:** Logic that interprets `team_assignment` vs `winning_team_assignment` to determine `calculated_result` (win/loss/draw) for both legacy and current match schemas.
- **Database Queries (Client-Side):**
    
    - **Auth:** [[supabase.auth.getUser]] for session verification.
    - **Profile:** Fetches user-specific metadata from the `profiles` table.
    - **Bookings & Games:** An intensive query that fetches match history joined with `games`, `matches`, and `is_winner` flags to reconstruct career history.

## 🔗 Links & Routing (Outbound)

- `href="/"` (Back to the main landing page)
- `href="/login"` (Automatic redirect for unauthenticated visitors)

## ⚡ Server Actions / APIs Triggered

- [[createClient]] (Instantiates the client-side Supabase connectivity)
- [[formatPosition]] (Helper utility that maps long position names like "Midfielder" to abbreviations like "MID")