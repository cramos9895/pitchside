# 🧩 LeagueRegistrationForm
**Type:** #component 
**Location:** `src/components/public/LeagueRegistrationForm.tsx`
**Last Audited:** 2026-04-12
**Architecture:** [[TournamentRegistrationClient.md]]

> [!WARNING]
> **DEPRECATED FOR ROLLING LEAGUES:** As of Phase-Split Architecture, this component is restricted to **Standard Leagues** and **Tournaments**. For match-based Rolling Leagues, use [[RollingRegistrationClient.md]] to avoid pricing collisions.

## 📥 Props Received
- `league`: `League` - The data row from the `leagues` table.
- `type`: `'team' | 'free_agent'` - Determines which form section to render.
- `isRolling`: `boolean` - Flag (Legacy/To be removed).

## 📝 Data Schema / Types
- [[04 - Database & API/Games.md]]
- [[04 - Database & API/Leagues.md]]

## 🎨 Visual DNA (Layout & UI) - Line-by-Line Copy
Use this section to quickly identify and modify text across different league types.

### 🏠 Section 1: Team / Player Identity
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Label | Team Name | `Team Name` |
| Placeholder | Team Input | `ENTER TEAM NAME` |
| Label | Primary Color | `Primary Color` |
| Label | Free Agent | `Preferred Positions` |

### 💳 Section 2: Payment Structure (Captain Flow)
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Header | Options Header | `Payment Structure` |
| Label | Full (Stripe) | `Pay Full Team Fee` |
| Label | Full (Cash) | `Register Full Team` |
| Helper | Cash Notice | `Paid At Field` |
| Label | Split | `Split Payment` |
| Description | Split Help | `Invite players to pay their share. Captain secures the spot.` |

### ✅ Section 3: Acknowledgements
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Checkbox | Cash Only | `I understand that all league fees must be paid in cash at the door.` |
| Checkbox | Stripe Split | `I understand I am financially responsible for the remaining balance...` |
| Checkbox | Waiver | `I have read and agree to the event rules.` |

### 🚀 Section 4: Submission
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Header | Waiver Section | `Event Waiver & Rules` |
| Button | Captain | `Register Team` |
| Button | FA (Cash) | `Confirm Registration` |
| Button | FA (Stripe) | `Pay & Enter Draft Pool` |

## 🎛️ Local State & UI Logic
- **`isCashLeague`**: Derived from `league.payment_collection_type === 'cash'`. Swaps labels from "Pay" to "Register" and shows the Cash Acknowledgement.
- **`paymentChoice`**: `full` vs `split`. Only Stripe leagues support the "Automatic charge for remaining balance" logic.

## ⚡ Actions & API Triggers
- [[actions/league-registration.ts]] (Legacy Structured Leagues)
- [[actions/rolling-league-registration.ts]] (New Rolling Leagues / Match-based)