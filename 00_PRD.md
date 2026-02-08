# PROJECT: PITCHSIDE - PICKUP SOCCER BOOKING PLATFORM
# ROLE: Senior Full-Stack Web Developer
# CONSTRAINT: User is non-technical. Detailed comments in plain English are REQUIRED in every file.

1. PROJECT OVERVIEW
A web-based platform for finding and booking local pickup soccer games in the Northwest Chicago Suburbs.
- Target Audience: Casual but competitive soccer players.
- Vibe/Aesthetic: "Premier League" style. Bold typography, high contrast (Black/White/Neon), sharp angles. Clean but energetic.

2. CORE FEATURES
- User Authentication: Sign up via Email or Google. (Use Supabase Auth).
- Game Feed: A list of upcoming games filtered by location (City/Zip).
- Booking System:
    - Users view game details (Time, Location, Price, Surface Type).
    - "Join Game" button triggers a Stripe Checkout flow.
    - Slot Reservation: A spot is only confirmed AFTER successful payment.
- Admin Portal:
    - "Host" view to see roster.
    - Check-in system (toggle switch for "Arrived").
    - Team Builder: Drag-and-drop players into "Team A" or "Team B".
- Chat System:
    - Real-time chat per game lobby (implemented via Supabase Realtime).
    - Admin announcements channel.

3. TECH STACK (STRICT)
- Framework: Next.js 14 (App Router).
- Styling: Tailwind CSS (crucial for the EPL aesthetic).
- Database & Auth: Supabase (PostgreSQL).
- Payments: Stripe (using 'stripe' npm package).
- Icons: Lucide-React.

4. SECURITY REQUIREMENTS
- Row Level Security (RLS) in Supabase must be enabled. Users can only see their own private data.
- Payments must use Stripe Elements (never touch raw credit card data).

5. DELIVERABLES (Initial Phase)
- A complete Next.js project structure.
- A setup script to initialize the Supabase database tables (users, games, bookings, messages).
- A 'README.md' with instructions on how to get the Stripe and Supabase API keys.
- Landing Page (Hero section, Featured Games).
- Dashboard (User's upcoming games).
- Game Details (Roster, Chat, Pay Button).
- Admin Portal (Roster management).
