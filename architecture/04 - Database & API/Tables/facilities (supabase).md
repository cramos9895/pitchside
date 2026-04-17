# 🗄️ Table: facilities

**Domain:** #database #facility  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique venue identifier. |
| **name** | `text` | - | - | Public business name. |
| **slug** | `text` | - | - | URL identifier (e.g. `pitch-one-nyc`). |
| **address** | `text` | - | - | Physical location. |
| **city** | `text` | - | - | City location. |
| **state** | `text` | - | - | Geographic state. |
| **zip_code** | `text` | - | - | Postal code. |
| **contact_email** | `text` | - | - | Primary support contact. |
| **contact_phone** | `text` | - | - | Primary support phone. |
| **stripe_account_id** | `text` | - | - | Connected Stripe account for payments. |
| **charges_enabled** | `boolean` | `false` | - | Stripe status flag. |
| **waiver_text** | `text` | - | - | Custom legal disclaimer for this venue. |
| **operating_hours** | `jsonb` | `{}` | - | Weekly schedule mapping. |
| **amenities** | `_text` | `{}` | - | Array of features (e.g. `Parking`, `Showers`). |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **has_many** | [[resources (supabase).md]] | `facility_id` | Fields and courts. |
| **has_many** | [[games (supabase).md]] | `facility_id` | Match events. |
| **has_many** | [[profiles (supabase).md]] | `facility_id` | Managing staff. |
| **has_many** | [[leagues (supabase).md]] | `facility_id` | Competition events. |

## 🛡️ RLS & Governance

- **Select**: Publicly readable (unauthenticated).
- **Update**: Restricted to the owner of the `stripe_account_id` or a `super_admin`.

---

**The `facilities` table represents the physical venues that host PitchSide games and manage resources.**