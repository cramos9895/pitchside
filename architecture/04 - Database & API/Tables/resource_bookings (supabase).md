# 🗄️ Table: resource_bookings

**Domain:** #database #infrastructure  
**Primary Key:** `id` (UUID)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**id**|`uuid`|Primary unique identifier for the specific physical field or court reservation.|
|**facility_id**|`uuid`|(FK) Reference to the parent venue record (`facilities` table).|
|**resource_id**|`uuid`|(FK) Link to the specific pitch or court (`resources` table).|
|**title**|`text`|The display title for the calendar block (e.g., "Men's 5v5 Soccer", "Private Rental").|
|**start_time**|`timestamp`|The exact commencement of the reservation window.|
|**end_time**|`timestamp`|The exact expiration of the reservation window.|
|**renter_name**|`text`|The display name for the individual or group responsible for the block.|
|**contact_email**|`text`|Primary transactional contact for verification and scheduling notifications.|
|**user_id**|`uuid`|(FK) Optional link to a `profiles` record for the primary renter.|
|**status**|`text`|Booking state: `confirmed`, `pending_facility_review`, `pending_contract`, `cancelled`.|
|**payment_status**|`text`|Financial resolution: `paid`, `unpaid`, `free`, `refunded`.|
|**listing_price**|`int4`|The total amount billed for the reservation (expressed in cents).|
|**color**|`text`|Hexadecimal color code used for UI representation on the host's calendar.|
|**recurring_group_id**|`uuid`|(FK) Link to a `recurring_booking_groups` record for bulk management of contract series.|
|**created_at**|`timestamp`|Auto-generated record audit trail.|

## 🔗 Relationships

- **belongs_to** facilities (`facility_id`)
- **belongs_to** resources (`resource_id`)
- **belongs_to** profiles (`user_id`)
- **belongs_to** recurring_booking_groups (`recurring_group_id`)

## 🛡️ RLS & Governance

- **Select**: Publicly readable while `status` is not `cancelled` (used for the venue's public availability map).
- **Update**: Restricted to the facility host (`auth.uid()` via `profiles.facility_id`) or a Super Admin.
- **The "Collision Logic" Anchor**: This table serves as the definitive source of truth for the platform's scheduling engine. All `join`, `league`, and `facility` actions execute a high-speed boundary check against this table before committing new dates to prevent overbooking physical resources.

---

**The `resource_bookings` table is the platform's "Physical Ledger," mathematically managing the availability of physical space across all event types, private rentals, and long-term contracts.**