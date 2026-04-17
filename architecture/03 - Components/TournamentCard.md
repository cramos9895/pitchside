# 🧩 TournamentCard
**Type:** #component 
**Location:** `src/components/public/TournamentCard.tsx`
**Last Audited:** 2026-04-12
**Architecture:** [[04 - Database & API/Games.md]]

## 📥 Props Received
- `tournament`: `Game` - The row from the `games` table with `tournament` event_type.
- `userId`: `string` - Current user ID.
- `registrations`: `any[]` - Existing registrations for this event.

## 📝 Data Schema / Types
- [[04 - Database & API/Games.md]] (Tournaments are technically specialized games)

## 🎨 Visual DNA (Layout & UI) - Line-by-Line Copy
Use this section to identify and modify text for One-off Tournaments.

### 🏠 Section 1: Header
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Date Display | Start time | `{formatDate} @ {formatTime}` |
| Map Label | Location | `{nickname} \| {location_name}` |

### 📊 Section 2: Details Matrix
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Label | Prize Icon | `Prize` |
| Value | Bounty/Reward | `{prize_display}` |
| Label | Format | `Style` |
| Value | Brackets | `{tournament_style}` (e.g., Round Robin) |
| Label | Teams Count | `Max Teams` |

### 🚀 Section 3: Action Footer
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Button | Join as Team | `Register Team` |
| Sub-label | Team Pricing | `($${team_price})` |
| Button | Join Pool | `Join Free Agent` |
| Sub-label | FA Pricing | `($${free_agent_price})` |
| Button | Captain Active | `Captain's Command Center` |

## 🎛️ Local State & UI Logic
- **Bracket Logic**: Uses the `getPrizeDisplay` helper to handle fixed bounties vs prize pools.
- **Route Injection**: Redirects to `/tournaments/[id]/register` but ensures the ID is derived from `game_id` for backward compatibility.

## ⚡ Actions & API Triggers
- Route: `/tournaments/${tournament.id}/register`
- Route: `/tournaments/${tournament.id}/team/${userTeamId}`