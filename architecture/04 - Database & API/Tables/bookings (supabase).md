# 🗄️ Table: bookings

**Domain:** #database #financial #competition **Primary Key:** `id` (UUID)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**id**|`uuid`|Primary unique identifier for the booking entry.|
|**game_id**|`uuid`|(FK) Reference to the parent event (`games` table).|
|**user_id**|`uuid`|(FK) Reference to the player's identity (`profiles` table).|
|**buyer_id**|`uuid`|(FK) The identity of the individual who paid for this spot.|
|**status**|`text`|Lifecycle state: `paid`, `active`, `cancelled`, `waitlist`, `free_agent_pending`.|
|**roster_status**|`text`|Meta-status for capacity: `confirmed`, `waitlisted`, `dropped`.|
|**payment_status**|`text`|Financial state: `pending`, `verified`, `refunded`.|
|**payment_method**|`text`|Transaction mode: `stripe`, `credit`, `manual`, `free`.|
|**payment_amount**|`numeric`|The actual amount paid (expressed in dollars in UI, cents in table logic).|
|**stripe_payment_intent_id**|`text`|Reference to the Stripe transaction for refund processing.|
|**stripe_payment_method_id**|`text`|Reference to the vaulted card for off-session "Team Manager" charges.|
|**team_assignment**|`text/int`|The squad name (or index) assigned to the player.|
|**is_captain**|`boolean`|Flag for specialized squad leadership permissions.|
|**is_winner**|`boolean`|Competitive flag assigned after `finalizeGame`.|
|**checked_in**|`boolean`|Physical verification status (sideline compliance).|
|**has_signed**|`boolean`|Flag indicating digital waiver completion.|
|**has_physical_waiver**|`boolean`|Administrative override flag for paper waivers.|

## 🔗 Relationships

- **belongs_to** games (`game_id`)
- **belongs_to** profiles (`user_id`)
- **belongs_to** profiles (`buyer_id`) - For squad/group payment routing.

## 🛡️ RLS & Governance

- **Select**: Users can read their own bookings; Host/Admins can read all bookings for their assigned facility.
- **Insert**: Publicly accessible via the `[[/api/join]]` gatekeeper (subject to capacity checks).
- **Update**: Restricted to the Host or Admin via `[[/api/kick]]` and `[[src/app/actions/compliance.ts]]`.
- **Transitions**: State changes to `cancelled` trigger the waitlist promotion engine in `[[/api/leave]]`.

---

**The `bookings` table is the platform's "Transactional Hub," mathematically linking player identities to financial settlements, roster spots, and competitive achievements.**