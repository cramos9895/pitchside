# 🧩 RollingLeagueCard
**Type:** #component 
**Location:** `src/components/public/RollingLeagueCard.tsx`
**Last Audited:** 2026-04-12
**Architecture:** [[RollingLeagueLobby.md]]

## 📥 Props Received
- `league`: `RollingLeagueData` - The game row with league metadata.
- `userId`: `string` - Current user ID.

## 📝 Data Schema / Types
- [[04 - Database & API/Games.md]] (Rolling leagues use the `games` table)

## 🎨 Visual DNA (Layout & UI) - Line-by-Line Copy
Use this section to identify and modify text for Rolling Leagues.

### 🏠 Section 1: Badges & Header
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Badge | Format Type | `Rolling League` |
| Badge | Cash Collection | `Cash Collection` |
| Header Icon | Icon Label | `Starts` |
| Header Icon | Icon Label | `Duration` |
| Header Icon | Icon Label | `Prize` |

### 📊 Section 2: Financial Matrix
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Label | Team Price Header | `Team Entry` |
| Value | Stripe Price | `$${team_price}` |
| Value | Cash Indicator | `Cash at Door` |
| Label | Cash Door Label | `Door Fee: {cash_fee_structure}` |
| Label | Stripe Admin Fee | `Admin Deposit Required` |
| Label | Free Agent Header| `Free Agent Cost` |
| Value | Free Agent Sub | `{price} / Match` (Cash) \| `/ Season` (Stripe) |

### 🚀 Section 3: Action Footer
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Button | CTA Label | `Explore Details` |

## 🎛️ Local State & UI Logic
- **`isCash`**: Swaps Section 2 logic between the Stripe `team_price` and the `cash_amount`.
- **`getPrizeDisplay`**: Logic for "Bragging Rights", "Percentage Pool", or "Cash Bounty".

## ⚡ Actions & API Triggers
- Route: `/games/${league.id}` (Points to [[RollingLeagueLobby]])
