// 🏗️ Architecture: [[GameForm.md]]

# Component: GameForm

The `GameForm` is the primary administrative engine for the PitchSide platform. It handles the creation and configuration of four distinct event types, each with its own specific validation rules, scheduling logic, and payment structures.

## Visual DNA

| Element | Specification | Rationale |
| :--- | :--- | :--- |
| **Background** | `#0a0a0a` (Pitch Black) | Deep charcoal for a premium, high-contrast look. |
| **Tabs** | Fixed Header with `#ccff00` text | High visibility for mode switching. |
| **Icons** | Lucide-React (Trophy, Zap, Activity, Clock) | Visual cues for different event formats. |
| **Borders** | `border-white/10` | Subtle, clean divisions without excessive weight. |
| **Typography** | Oswald (Bold/Italic) | Aggressive, athletic feel for configurator titles. |

---

## 📋 Copy & Logic: Standard Mode (Pickup)
*Used for one-off pickup matches.*

| Section/Label | UI Text | Variable / State Hook | Logic Notes |
| :--- | :--- | :--- | :--- |
| **Title** | Match Name | `title` | Required. |
| **Subtitle** | Match Type | `matchType` | Dropdown: Competitive, Fun, Vet, etc. |
| **Location** | Location (Google Search) | `locationName` | Integrated with Google Autocomplete. |
| **Pricing** | Entry Price ($) | `price` | Flat per-player fee. |
| **Capacity** | Total Players Needed | `maxPlayers` | Controls the "Full" state on the card. |
| **Generator** | Team Creator | `teamGenerator` | Toggles automatic squad balancing. |

---

## 🏆 Copy & Logic: Micro-Tournament
*Used for high-stakes, bracket-based competitions.*

| Section/Label | UI Text | Variable / State Hook | Logic Notes |
| :--- | :--- | :--- | :--- |
| **Configurator** | Micro-Tournament Configurator | `activeTab === 'tournament'` | Shows Trophy icon. |
| **Format** | Tournament Format | `tournamentStyle` | Group Stage vs. Single/Double Elim. |
| **Guarantee** | Minimum Guaranteed Games | `minimumGamesPerTeam` | Only visible if Group Stage is selected. |
| **Pricing** | Total Team Fee ($) | `teamPrice` | Fee for the entire squad. |
| **Registration** | Team Registration Fee ($) | `depositAmount` | Non-refundable deposit logic hook. |
| **Prize** | Prize Format Logic | `prizeType` | Percentage Pool vs. Fixed Bounty. |

---

## 🗓️ Copy & Logic: Multi-Week League
*Used for structured seasons with regular/post-season phases.*

| Section/Label | UI Text | Variable / State Hook | Logic Notes |
| :--- | :--- | :--- | :--- |
| **Timeline** | Season Timeline | `activeTab === 'league'` | Displays chronological validation pill. |
| **Lock Date** | Roster Lock Date | `rosterLockDate` | Date when captain access is restricted. |
| **Start Date** | Regular Season Start | `regularSeasonStart` | The actual kickoff date of Week 1. |
| **Freeze** | Roster Freeze Date | `rosterFreezeDate` | Mid-season cutoff for adding players. |
| **Playoffs** | Playoff Start Date | `playoffStartDate` | Delineates the transition to brackets. |

---

## ⚡ Copy & Logic: Rolling League
*Used for match-based, ongoing registrations.*

| Section/Label | UI Text | Variable / State Hook | Logic Notes |
| :--- | :--- | :--- | :--- |
| **Identity** | Team Jersey Preferred Color | `primaryColor` | Changed from color picker to text input. |
| **Payment** | Split Payment | `paymentChoice === 'split'` | **RESTRICTED:** Disabled for Cash-at-door leagues. |
| **Terms** | League Rules & Terms | `description` / `waiver_details` | Displays both high-level rules and legal language. |

---

## Technical Logic Hook Summary

### 1. The Mode Switcher
The form uses a local state `activeTab` which acts as a filter for the `handleSubmit` logic. When submitting, the form sends an `is_league` flag for any type that isn't a Standard Pickup.

### 2. The Database Sync
Before submission, the pricing fields are mapped carefully:
- `price` -> Used for Standard.
- `team_price` -> Used for Tournament / League / Rolling.
- `free_agent_price` -> Used for League / Rolling.

### 3. Safety Guard
The form includes an `isRefundable` toggle. If disabled, the `refund_cutoff_date` is omitted to prevent confusing UI in the player's booking modal.

---

### Verification Checklist & Technical Delta
- [x] Verified `activeTab` mappings.
- [x] Confirmed `payment_collection_type` logic for Rolling Leagues.
- [x] Validated color system vs. `--color-pitch-accent`.
- [ ] Next Step: Finalize [TeamManager.md] integration.