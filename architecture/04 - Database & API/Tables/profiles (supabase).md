# 🗄️ Table: profiles

**Domain:** #database #identity #financial **Primary Key:** `id` (UUID) - 🔗 Linked to `auth.users.id`

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**id**|`uuid`|Primary unique identifier (Auth-synced).|
|**full_name**|`text`|The player's legal name used for rosters and waivers.|
|**username**|`text`|Public handle for leaderboards and social feeds.|
|**email**|`text`|Primary transactional contact (Sync with Auth).|
|**phone**|`text`|Contact number for SMS notifications and verify.|
|**role**|`text`|Local platform role: `user`, `host`, `admin`, `master_admin`.|
|**system_role**|`text`|Elevated systemic access: `super_admin`, `facility_admin`.|
|**facility_id**|`uuid`|(FK) Operational link for `host` or `facility_admin` accounts.|
|**credit_balance**|`int4`|Player's "Pitchside Wallet" balance (expressed in cents).|
|**free_game_credits**|`int4`|Bucket for MVP rewards redeemable via `[[/api/join-with-credit]]`.|
|**mvp_awards**|`int4`|Lifetime counter incremented via `[[src/app/actions/finalize-game.ts]]`.|
|**stripe_customer_id**|`text`|Reference to the Stripe customer profile.|
|**skill_level**|`text`|Player classification: `Beginner`, `Intermediate`, `Advanced`.|
|**is_banned**|`boolean`|Platform suspension flag.|
|**banned_until**|`timestamp`|Expiration date for temporary platform suspensions.|
|**avatar_url**|`text`|Public link to the player's profile image.|

## 🔗 Relationships

- **belongs_to** facilities (`facility_id`) - For administrative context.
- **has_many** bookings (via `user_id`)
- **has_many** bookings (via `buyer_id`) - Linking purchases.

## 🛡️ RLS & Governance

- **Select**: Publicly readable for identification; sensitive fields (`credit_balance`) restricted to the profile owner or a Super Admin.
- **Update**: Restricted to the profile owner (`auth.uid() = id`) for personal PII; restricted to Super Admins for roles and balances.
- **Triggered logic**: `mvp_awards` and `free_game_credits` are atomically updated by the platform's game lifecycle engine.

---

**The `profiles` table is the "Identity Hub" of PitchSide, mathematically linking user authentication to financial wallets, competitive stats, and administrative permissions.**