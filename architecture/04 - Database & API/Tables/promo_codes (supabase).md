# 🗄️ Table: promo_codes

**Domain:** #database #financial #marketing  
**Primary Key:** `id` (UUID)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**id**|`uuid`|Primary unique identifier for the promotion.|
|**code**|`text`|The public-facing string used at checkout (e.g., `FIFTYFREE`). Case-insensitive.|
|**discount_type**|`text`|The reduction method: `percentage`, `fixed_amount`, or `free`.|
|**discount_value**|`numeric`|The magnitude of the discount (e.g., `50` for 50% or `$5.00`).|
|**facility_id**|`uuid`|(FK) Optional link to a venue. **NULL** indicates a global platform-wide promotion.|
|**max_uses**|`int4`|The maximum number of successful redemptions allowed globally.|
|**current_uses**|`int4`|Atomic counter tracking total redemptions.|
|**expires_at**|`timestamp`|The temporal deadline for code validity.|
|**created_at**|`timestamp`|Auto-generated record audit trail.|

## 🔗 Relationships

- **belongs_to** facilities (`facility_id`) - Enables venue-specific discounts.
- **has_many** bookings - Links redemptions to specific reservations for financial auditing.
- **utilized_by** public-booking & join-logic.

## 🛡️ RLS & Governance

- **Select**: Publicly searchable via the `validatePromoCode` action, which enforces cleaning (uppercase/trimming) and exact matches.
- **Update**: Strictly restricted to **Super-Admins** (for global codes) or **Facility Admins** (for codes linked to their `facility_id`).
- **Validation Logic**: The platform implements a "Server-Side Verification" pattern, checking `expires_at` and `max_uses` vs. `current_uses` before calculating the final Stripe `PaymentIntent` amount.
- **Atomic Counter**: `current_uses` is incremented during the success phase of the payment lifecycle to prevent over-redemption in high-concurrency environments.

---

**The `promo_codes` table is the platform's "Incentive Engine," providing the mathematical logic for financial deductions and marketing campaigns across the ecosystem.**