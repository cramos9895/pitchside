# 🧩 PublicFacilityCard

**Type:** #component **Location:** `src/components/public/PublicFacilityCard.tsx`

## 📥 Props Received

- **facility** (object): Contains the core marketing metadata for a venue, including `slug`, `hero_image_url`, and `amenities`.

## 🎛️ Local State & UI Logic

- **Hover-Active Aesthetics**:
    - Implements a `group-hover` scale-up effect on the background image.
    - Adds a subtle `pitch-accent` outer glow and a `-translate-y-1` lift when hovered, signaling interactivity.
- **Amenity Prioritization**:
    - **Primary Tag**: Automatically promotes the first item in the `amenities` array to a high-contrast floating badge on the image banner.
    - **Overflow Logic**: Displays a maximum of 3 secondary amenity pills at the bottom, appending a `+X more` label for facilities with extensive feature lists.
- **Adaptive Fallbacks**:
    - Uses a `radial-gradient` dot pattern and a slate-to-pitch-black gradient if no hero image is provided, preventing "empty states" from breaking the visual rhythm of the discovery feed.
- **Layout Consistency**:
    - Utilizes `line-clamp-2` on the description and a consistent `h-48` image height to ensure uniform card dimensions within high-density search grids.

## 🔗 Used In (Parent Pages)

- `src/app/facilities/page.tsx` (Facility Discovery/Search Feed)
- `src/app/page.tsx` (Home Page "Featured Venues" Section)

## ⚡ Actions & API Triggers

- **`Next/Link` Integration**: Routes the user to the dynamic `/facility/[slug]` path, leveraging the unique URL slug for SEO-optimized navigation.

---

**PublicFacilityCard is the primary discovery unit for the PitchSide marketplace, designed to convert casual browsing into venue engagement through high-impact visual hierarchy.**