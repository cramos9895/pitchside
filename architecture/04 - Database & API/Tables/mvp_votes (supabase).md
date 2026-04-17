# 🗄️ Table: mvp_votes

**Domain:** #database #competition  **Primary Key:** `id` (UUID)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `uuid` | `gen_random_uuid()` | - | Unique vote record identifier. |
| **game_id** | `uuid` | - | `games.id` | The match where the vote was cast. |
| **voter_id** | `uuid` | - | `profiles.id` | The participant casting the vote. |
| **candidate_id** | `uuid` | - | `profiles.id` | The player receiving the vote. |
| **created_at** | `timestamp` | `now()` | - | Audit timestamp. |

## 🔗 Relationships

| Relation | Table | Key | Description |
|---|---|---|---|
| **belongs_to** | [[games (supabase).md]] | `game_id` | The game context. |
| **belongs_to** | [[profiles (supabase).md]] | `voter_id` | The voting player. |
| **belongs_to** | [[profiles (supabase).md]] | `candidate_id` | The nominated player. |

## 🛡️ RLS & Governance

- **Select/Insert**: Restricted to players who were checked in to the specific `game_id`.
- **Constraint**: A player cannot vote for themselves (Logic enforced in API/RPC).

---

**The `mvp_votes` table feeds the automated award system used to distribute platform credits.**
<!-- slide -->
# 🗄️ Table: site_content

**Domain:** #database #cms  **Primary Key:** `id` (Int)

## 📄 Column Definitions

| Column | Type | Default | Foreign Key | Description |
|---|---|---|---|---|
| **id** | `int4` | `1` | - | Singleton identifier (must always be 1). |
| **hero_headline** | `text` | - | - | Main H1 text on the landing page. |
| **hero_subtext** | `text` | - | - | Support text under the headline. |
| **hero_image_url** | `text` | - | - | Cloudinary/S3 link to hero asset. |
| **how_it_works_image_url** | `text` | - | - | Support asset for the info section. |
| **testimonial_text** | `text` | - | - | Featured user feedback. |
| **updated_at** | `timestamp` | `now()` | - | Last modification time. |

## 🛡️ RLS & Governance

- **Select**: Publicly readable (unauthenticated).
- **Update**: Strictly restricted to `master_admin` roles.

---

**The `site_content` table acts as a lightweight CMS for managing static marketing copy without redeploying code.**
