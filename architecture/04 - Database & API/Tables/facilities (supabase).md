# 🗄️ Table: facilities

**Domain:** #database #infrastructure #financial **Primary Key:** `id` (UUID)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**id**|`uuid`|Primary unique identifier for the venue.|
|**name**|`text`|The public-facing name of the sports center.|
|**slug**|`text`|URL-safe identifier for public venue routing (e.g., `pitchside-east`).|
|**address**|`text`|Full street address of the physical venue.|
|**city**|`text`|City or locality.|
|**state**|`text`|Region or state.|
|**zip_code**|`text`|Postal code for spatial filtering.|
|**public_description**|`text`|Markdown-supported field for the facility's CMS page.|
|**hero_image_url**|`text`|Public link to the venue's primary aesthetic background.|
|**contact_email**|`text`|Primary host contact for participants.|
|**contact_phone**|`text`|Primary host contact number.|
|**amenities**|`jsonb`|Array of facility features: `["Showers", "Parking", "WiFi"]`.|
|**operating_hours**|`jsonb`|Weekly schedule: `{ "monday": { "open": "08:00", "close": "22:00" } }`.|
|**waiver_text**|`text`|The unique legal Terms & Conditions managed via `[[src/app/actions/facility.ts]]`.|
|**stripe_account_id**|`text`|The unique link to the **Stripe Connect Express** account for payouts.|
|**is_active**|`boolean`|Global visibility flag for the public marketplace index.|

## 🔗 Relationships

- **has_many** profiles (via `facility_id`) - Link to administrative hosts.
- **has_many** resources (via `facility_id`) - Link to physical fields/courts.
- **has_many** games (via `facility_id`) - Link to hosted events.
- **has_many** leagues (via `facility_id`) - Link to hosted competitions.

## 🛡️ RLS & Governance

- **Select**: Publicly readable for marketplace browsing.
- **Update**: Strictly restricted to the facility admin (`auth.uid()` checked via `profiles.facility_id`) or a Super Admin.
- **Stripe Bridge**: The `stripe_account_id` is only editable through the **Connect OAuth** loop in `[[/api/stripe/connect]]`.

---

**The `facilities` table is the platform's "Tenant Authority," serving as the high-level container for all resources, schedules, and financial settlement destinations.**