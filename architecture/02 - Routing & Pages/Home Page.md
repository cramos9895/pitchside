# 📄 Home Page

**Path:** `src/app/page.tsx` (Root Landing Page)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Hero Section:** Displays dynamic `hero_headline`, `hero_subtext`, and `hero_image_url` with a stylized background glow.
        
    - **How It Works Section:** 3-step instructional grid ("Find a Match", "Secure Your Spot", "Play to Win") alongside a dynamic `how_it_works_image_url`.
        
    - **Social Proof Section:** Renders a dynamic `testimonial_text` with a 5-star `Quote` block.
        
    - **Featured Games Preview:** Renders a grid of the next 3 upcoming matches.
        
- **Imported Custom Components:**
    
    - [[GameCard]] (Used for standard pickup games)
        
    - [[TournamentCard]] (Used if `event_type === 'tournament'`)
        
    - [[LeagueCard]] (Used if `event_type === 'league'` or `is_league === true`)
        
- **Icons (lucide-react):**
    
    - `ArrowRight`, `Star`, `Quote`, `CheckCircle2`
        
- **Buttons / Clickable Elements:**
    
    - **"Find a Game" Button:** Primary Hero CTA.
        
    - **"View All" Link:** Header link in the Featured Games section.
        

## 🎛️ State & Variables

- **TypeScript Interfaces:**
    
    - [[Game]]: Defines the exact Supabase schema for a game/event object.
        
- **Data Maps & Arrays (Server-Side):**
    
    - `joinedGameIds`: Array of game IDs the active user is currently registered for.
        
    - `bookingStatusMap`: Maps a `game_id` to its booking `status`.
        
    - `bookingIdMap`: Maps a `game_id` to its specific booking `id`.
        
    - `userTeamRoles`: Maps a `game_id` to the user's tournament `role`.
        
    - `userTeamIds`: Maps a `game_id` to the user's `team_id`.
        
    - `thisTournamentRegs`: A reconstructed array specifically built during the render loop to pass registration context down to the [[TournamentCard]].
        
- **Database Queries:**
    
    - **Site Content:** Fetches global UI text and images from the `site_content` table.
        
    - **Auth:** Fetches the current authenticated `user`.
        
    - **Bookings:** Fetches the user's active rows from the `bookings` table.
        
    - **Registrations:** Fetches the user's active rows from the `tournament_registrations` table.
        
    - **Games:** Fetches exactly 3 upcoming, non-cancelled events from the `games` table, ordered by start time.
        

## 🔗 Links & Routing (Outbound)

- `href="/schedule"` (Triggered by the Hero "Find a Game" button)
    
- `href="/schedule"` (Triggered by the Featured Games "View All" button)
    

## ⚡ Server Actions / APIs Triggered

- [[createClient]] (Instantiates the server-side Supabase connection)
    
- [[supabase.auth.getUser]] (Verifies the active session to filter out games the user is already playing in)