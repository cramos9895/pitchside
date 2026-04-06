# 🧩 SiteEditor

**Type:** #component **Location:** `src/components/admin/SiteEditor.tsx`

## 📥 Props Received

- _None (This is a self-fetching administrative module)._

## 🎛️ Local State & UI Logic

- **`content` ([[SiteContent]])**: A single-object state that acts as the source of truth for the landing page's copy and configuration.
- **Binary Image Pipeline**:
    - Uses `useRef` to trigger hidden `<input type="file" />` elements for a cleaner UI.
    - Splits upload states (`uploadingHero`, `uploadingHow`) to provide granular feedback for different asset sections.
- **`handleTextChange`**: A generic change handler that dynamically updates specific keys within the `SiteContent` state using bracket notation.
- **AspectRatio Previews**: Implements CSS-based constraints (e.g., `aspect-[21/9]` for Hero Backgrounds) to ensure administrators see an accurate representation of how assets will render on the public site.

## 🔗 Used In (Parent Pages)

- `src/app/admin/(dashboard)/settings/page.tsx` (Specifically within the Site Content tab)

## ⚡ Actions & API Triggers

- **[[supabase.from('site_content').select]]**: Fetches the global configuration record (ID: 1) on component mount.
- **[[supabase.storage.from('public-assets').upload]]**: Streams binary image data directly to the public asset bucket.
- **[[supabase.storage.from('public-assets').getPublicUrl]]**: Retrieves the persistent CDN URL for newly uploaded landing page assets.
- **[[supabase.from('site_content').update]]**: The primary save action that flushes all text edits and new image URLs to the database.
- **`useToast`**: Dispatches system-level notifications (`success` or `error`) to confirm data persistence.

---

**SiteEditor provides a "no-code" interface for the core platform branding, abstracting complex storage bucket operations into a simple text/image form.**