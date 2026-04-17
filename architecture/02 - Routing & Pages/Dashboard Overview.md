# 📄 Dashboard Overview

**Path:** `src/app/dashboard/page.tsx`
**Last Audited:** 2026-04-10

## 🎨 Visual DNA (Layout & UI)
- **Container:** `space-y-12 animate-in fade-in duration-700 relative`
- **Background:** `fixed bg-[radial-gradient(...)]` - Subtle ambient pulse.
- **Player Stats Header:** `flex flex-col md:flex-row md:items-end justify-between border-b pb-8` - Displays Wallet Balance and Profile CTA.
- **Main Grid:** `grid grid-cols-1 lg:grid-cols-12 gap-12` - Splits into "Next Up" (8 cols) and "Action Items" (4 cols).

## 🧩 Components & UI
- [[GameCard]] | [[LeagueCard]] | [[TournamentCard]] - Polymorphic rendering in the "Next Up" slot.
- [[ActionItems]] | [[RentalPaymentCard]] - Section for pending financial commitments.
- [[useToast]] - Hook for transaction feedback.

## 🎛️ State & Variables
- `unifiedEvents`: `any[]` - A chronologically sorted array that merges Rentals, Pickup Games, and Tournaments.
- `actionRequiredRentals`: `any[]` - Grouped bookings requiring payment via `recurring_booking_groups`.
- `creditBalance`: `number` (cents) - Fetched from [[profiles (supabase)]].

## 🔗 Links & Routing (Outbound)
- `href="/schedule"` - Primary CTA for empty states.
- `href="/profile"` - Redirect to owner metadata.

## ⚡ Server Actions / APIs Triggered
- **[[createContractCheckoutSession]]**: Initiates Stripe for facility rentals.
- **[[supabase.auth.getUser]]**: Hydrates the dashboard session.
- **[[Unified Data Fetching]]**: Multi-table parallel fetch using `Promise.all`.
