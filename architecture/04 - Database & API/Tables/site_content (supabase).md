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
