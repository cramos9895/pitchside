# 🧩 GameCard
**Type:** #component 
**Location:** `src/components/GameCard.tsx`
**Last Audited:** 2026-04-12
**Architecture:** [[04 - Database & API/Games.md]]

## 📥 Props Received
- `game`: `Game` - The match data row.
- `user`: `User` - Current auth user.
- `bookingStatus`: `string` - 'paid' | 'waitlist' | 'active'.

## 📝 Data Schema / Types
- [[04 - Database & API/Games.md]]

## 🎨 Visual DNA (Layout & UI) - Line-by-Line Copy
Use this section to identify and modify text for standard pickup matches.

### 🏠 Section 1: Header & Status
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Title Fallback | No title set | `{game_format} Pickup` |
| Badge | Cancelled | `Cancelled` |
| Badge | Completed | `Completed` |
| Badge | Active | `Upcoming` |

### 📊 Section 2: Details Matrix
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Label | Players | `Players` |
| Value | Roster Count | `{current_players} / {max_players}` |
| Label | Style | `Format` |
| Value | Match Style | `{match_style} \| {game_format}` |
| Label | Fee | `Fee` |
| Value (Joined) | Paid | `Paid` |
| Value (Waitlist) | Waitlist | `Waitlist` |

### 🚀 Section 3: Action Footer
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Button | Standard Join | `Join Now` |
| Button | Full Game | `Waitlist` |
| Button | View Dashboard | `Match Lobby` |
| Button | Left Match | `Cancel Spot` |
| Button | Detail Page | `Details` |
| Label | Cancelled | `Event Cancelled` |

## 🎛️ Local State & UI Logic
- **`isLive`**: Calculated from `!isPastStrict && !isCancelled`. Drives the green/yellow status bar.
- **`currentPlayers`**: Managed via Realtime subscription for instant roster updates on the card.
- **Switchboard Logic**: If `event_type === 'league'`, this component automatically hot-swaps itself for the [[LeagueCard]] or [[RollingLeagueCard]].

## ⚡ Actions & API Triggers
- `cancelBooking` (Server Action)
- `/api/join` (Internal API)
- `/api/waitlist` (Internal API)