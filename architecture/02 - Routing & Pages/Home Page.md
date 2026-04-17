# 📄 Home Page

**Path:** `src/app/page.tsx` (Root Landing Page)
**Last Audited:** 2026-04-10

## 🎨 Visual DNA (Layout & UI)
- **Container:** `min-h-screen bg-pitch-black text-white font-sans selection:bg-pitch-accent pt-2 pb-20`
- **Global Components:** [[Navbar]] (Global Layout), [[Sidebar]] (Global Layout)

### Section: Hero
- **Structure:** `relative px-6 min-h-[70vh] flex flex-col items-center justify-center text-center`
- **Background:** `absolute w-[600px] h-[600px] bg-pitch-accent/10 blur-[120px] rounded-full`
- **Badge:** `inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-pitch-accent`
- **Typography:** `font-heading text-5xl md:text-7xl lg:text-8xl italic leading-[0.9] tracking-tighter`

### Section: How It Works
- **Structure:** `py-24 px-6 bg-black/50 border-y border-white/5 mt-12`
- **Grid:** `grid grid-cols-1 lg:grid-cols-2 gap-12 items-center`
- **Step Icons:** `w-16 h-16 rounded bg-white/5 border border-white/10 text-pitch-accent group-hover:bg-pitch-accent group-hover:text-black`

### Section: Featured Matches
- **Structure:** `py-20 px-6 bg-pitch-black border-t border-white/5`
- **Heading Block:** `flex items-end justify-between mb-12 border-b border-white/10 pb-6`
- **Cards Grid:** `grid grid-cols-1 md:grid-cols-3 gap-6`

## 🧩 Components & UI
- [[GameCard]] - Renders standard pickup matches.
- [[TournamentCard]] - Renders events where `event_type === 'tournament'`.
- [[LeagueCard]] - Renders events where `is_league === true`.

## 🎛️ State & Variables (Server-Side)
- `siteContent`: Fetched from `site_content` table (Headline, Subtext, Hero/How images).
- `joinedGameIds`: Array of IDs filtered from `bookings`.
- `bookingStatusMap`: `Map<string, string>` (game_id -> status).
- `userTeamRoles`: `Map<string, string>` (game_id -> role).
- `games`: `Game[]` - Limited to 3 upcoming, non-cancelled matches.
- [[types.ts]] | Core Data Interfaces

## 🔗 Links & Routing (Outbound)
- `href="/schedule"` - Primary CTA "Find a Game".
- `href="/login"` - Auth redirect in [[GameCard]].
- `href="/games/[id]"` - Detail view routing.

## ⚡ Server Actions / APIs Triggered
- [[createClient]] - Establishes Server-Side Supabase session.
- [[supabase.auth.getUser]] - Fetches session for personalization.