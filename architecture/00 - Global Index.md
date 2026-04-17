# 🏟️ PitchSide: Architecture Index

Welcome to the central architectural map. Use this index to navigate the codebase by **Feature Area** rather than just file structure.

## ⚽ Core Match Engine
The heart of the platform, handling discovery, capacity, and the game lifecycle.
- **Entry Points:** [[Home Page]], [[Live Marketplace (God View)]]
- **Components:** [[GameCard]], [[GameForm]], [[MatchManager]]
- **Data Layers:** [[games (supabase)]], [[bookings (supabase)]], [[match_players (supabase)]]

## 🏆 Competitive Systems
Logic for leagues, tournaments, and rolling formats.
- **Pages:** [[Tournament Lobby Page]], [[Schedule Page]]
- **Components:** [[GameCard]], [[LeagueCard]], [[TournamentCard]], [[RollingLeagueCard]], [[AdminMatchCards]], [[LeagueBuilderForm]], [[StandingsTable]], [[LeagueRegistrationForm]]
- **Data Layers:** [[leagues (supabase)]], [[teams (supabase)]], [[league_matches (supabase)]]

## 💳 Financial & Revenue Engine
Stripe integration, platform fees, and local wallets.
- **Engines:** [[Revenue Engine & Financials]], [[Stripe Connect Support]]
- **Logic:** [[stripe-payment.md]], [[payments-utility.md]], [[processLeaguePayments.md]]
- **Data Layers:** [[pending_checkouts (supabase)]], [[platform_settings (supabase)]]

## 👤 Identity & User Experience
Authentication, profiles, and communication.
- **Entites:** [[Profile Page]], [[User Account Settings]]
- **Components:** [[ChatInterface]], [[Navbar]], [[Sidebar]]
- **Data Layers:** [[profiles (supabase)]], [[notifications (supabase)]]

## 🏗️ Physical Facilities
Resource management (fields, courts, staff).
- **Control:** [[Facility Detail & Control Node]], [[Facility Directory (Admin)]]
- **Components:** [[PublicFacilityCalendar]], [[FieldProjector]]
- **Data Layers:** [[facilities (supabase)]], [[resources (supabase)]]

## ⚙️ Administrative Backbone
Global settings, CMS, and moderation.
- **Master Control:** [[System Settings & CMS]], [[Approval Queue (Master Admin)]]
- **Data Layers:** [[system_settings (supabase)]], [[activity_types (supabase)]]

---
*Last Re-indexed: 2026-04-10*
