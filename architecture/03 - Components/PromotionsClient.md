# 🧩 PromotionsClient

**Type:** #component #admin
**Location:** `src/app/admin/(dashboard)/settings/promotions/PromotionsClient.tsx`
**Last Audited:** 2026-04-10

## 📥 Props Received
- `initialPromos`: `PromoCode[]` - Existing data fetched on server.

## 📝 Data Schema / Types
- `interface PromoCode`
- [[promo_codes (supabase)]]

## 🎨 Visual DNA (Layout & UI)
- **Container:** `max-w-6xl mx-auto py-8 px-6`
- **Promo Grid:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- **Cards:** `bg-pitch-card border border-white/10 p-5 rounded-lg transition-all`
- **Badges:** Indicates `Expired` or `Depleted` status using `red-500/20`.

## 🎛️ Local State & UI Logic
- **Code Generator**: Logic to randomize/validate unique strings for new promo codes.
- **Expiry Logic**: Frontend comparison of `expires_at` vs `new Date()` to visually flag inactive codes.
- **Creation Modal**: `useState` controlled form for `discount_type` (`percentage` vs `fixed_amount`).

## 🔗 Used In (Parent Pages)
- [[Global Promotions & Discounts]]

## ⚡ Actions & API Triggers
- **[[api/promo/create]]**: (Conceptual) creation via Supabase Client.
- **[[api/promo/delete]]**: Removal of codes.
