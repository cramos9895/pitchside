# 🧩 LeagueCard
**Type:** #component 
**Location:** `src/components/public/LeagueCard.tsx`
**Last Audited:** 2026-04-12
**Architecture:** [[04 - Database & API/Leagues.md]]

## 📥 Props Received
- `league`: `LeagueData` - The row from the `leagues` table.
- `userId`: `string` - Current user ID.

## 📝 Data Schema / Types
- [[04 - Database & API/Leagues.md]] (Structured leagues)

## 🎨 Visual DNA (Layout & UI) - Line-by-Line Copy
Use this section to identify and modify text for Structured Leagues.

### 🏠 Section 1: Header & Badge
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Badge | Format | `Multi-Week League` |
| Sidebar | Card Accent | `bg-pitch-accent` (Solid Green) |

### 📊 Section 2: Timeline Matrix
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Label | Season Start | `Start` |
| Label | Playoff Period | `Playoffs` |
| Label | Rewards | `Prize` |

### 📋 Section 3: Info Bar
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Label | Lock Date | `Roster Lock` |
| Label | Capacity | `Max Teams` |

### 🚀 Section 4: Action Footer
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Button | Team Join | `Register Team` |
| Sub-label | Team Pricing | `($${teamPrice})` |
| Button | FA Join | `Join Free Agent` |
| Sub-label | FA Pricing | `($${freeAgentPrice})` |
| Button | Registered Captain | `Captain's Command Center` |
| Button | Registered Player | `View Player Dashboard` |

## 🎛️ Local State & UI Logic
- **Data Harmonization**: Maps different table columns (`start_time` vs `start_date`) to single display variables like `regularSeasonStart`.
- **Role Detection**: Swaps the "Register" buttons for "Command Center" buttons if a user registration is found.

## ⚡ Actions & API Triggers
- Route: `/tournaments/${league.id}/register`
- Route: `/tournaments/${league.id}/team/${userTeamId}`