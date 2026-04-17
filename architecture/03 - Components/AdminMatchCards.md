# 🧩 Admin Match Cards
**Type:** #component-set 
**Location:** `src/components/admin/`
**Last Audited:** 2026-04-12

This note covers the specialized cards seen by Master Admins and Facility Admins in the Management Dashboard.

## 📇 Included Components
- `AdminPickupCard.tsx`
- `AdminLeagueCard.tsx`
- `AdminTournamentCard.tsx`

## 🎨 Visual DNA (Layout & UI) - Line-by-Line Copy

### 🏠 Section 1: Top Badges (Metadata)
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Badge Label | Pickup | `Pickup Match` |
| Badge Label | League | `Structured League` |
| Badge Label | Rolling | `Rolling Format` |
| Status Badge | Live | `Live Now` |
| Status Badge | Completed | `Completed` |
| Status Badge | Problem | `Refund Needed` |

### 📋 Section 2: Management Info Matrix
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Label | Time Slot | `Date & Time` |
| Label | Players | `Roster` |
| Helper | Spots | `{n} Spots Left` |
| Label | Venue | `Location` |
| Label | Game Type | `Format` |
| Helper | Length | `{duration} Duration` |

### 🛠️ Section 3: Manager Controls (CTAs)
| Variable | Context | Current Text |
| :--- | :--- | :--- |
| Button | Primary Admin | `Manage Pickup Event` |
| Button | Summary | `View Summary` |
| Button | Refund CTA | `Process Refund` |
| Tooltip | Edit Icon | `Edit Match` |
| Tooltip | Cancel Icon | `Cancel Match` |
| Tooltip | Delete Icon | `Hard Delete (Wipe DB)` |

## 🎛️ Local State & UI Logic
- **Refund Detection**: If `status === 'cancelled'` AND `refund_processed === false`, the card turns red and the primary button changes to "Process Refund".
- **Realtime Sync**: Most admin cards rely on the parent `AdminGameList` for state, but individual cards use `isPast` logic to disable the Edit button once a game starts.

## ⚡ Actions & API Triggers
- `onEdit`: Opens the Global `GameForm` modal.
- `onCancel`: Triggers cancellation logic (usually issues wallet refunds).
- `onHardDelete`: Permanently removes the record from the database.
