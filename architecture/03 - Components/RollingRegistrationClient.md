# 🧩 RollingRegistrationClient
**Type:** #component 
**Location:** `src/components/public/RollingRegistrationClient.tsx`
**Last Audited:** 2026-04-12
**Architecture:** [[RollingLeagueLobby.md]]

## 📖 Purpose
The primary registration interface for **Match-based Rolling Leagues**. This component was decoupled from the standard `LeagueRegistrationForm` to prevent naming collisions between Upfront Registration Fees and Weekly Match Fees.

## 💾 Pricing Isolation (Crucial)
To resolve variable shadowing, this component explicitly maps database fields:
- **`player_registration_fee`** ➜ Rendered as **Registration Fee** (Upfront cost).
- **`cash_amount`** ➜ Rendered as **Weekly Door Fee** (Per-game cost at the facility).

## 📥 Props Received
- `league`: `object` - Data from the `games` table.
- `type`: `'team' | 'free_agent'` - Registration role.

## 🎨 Content & Labels
- **Headings:** Large italic italic title pulled from `league.title`.
- **Sub-Label (Free Agent):** `Free Agent Draft Pool`.
- **Sub-Label (Captain):** `Rolling League Captain`.

## ⚡ API Integrations
- Calls `registerRollingCaptain` and `registerRollingFreeAgent` from `src/app/actions/rolling-league-registration.ts`.
- Uses `StripeCheckoutModal` specifically for the `player_registration_fee` if `payment_collection_type` is NOT `cash`.

## 🏗️ Technical Notes
- Decoupled from `TournamentRegistrationClient` to allow specialized UI tweaks for match-based play without risking regressions in Stripe-heavy tournament flows.
