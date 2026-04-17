# 🌍 Environment Variables

**Type:** #globals #config 
**Location:** `.env.local`
**Last Audited:** 2026-04-10

## 🔑 Required Keys

### Supabase (Database & Auth)
- `NEXT_PUBLIC_SUPABASE_URL`: The platform's direct access endpoint.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public client key for RLS-scoped data.
- `SUPABASE_SERVICE_ROLE_KEY`: **CRITICAL SECRET.** Overrides all RLS. Only for Server Actions.

### Stripe (Payments)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Client-side key for checkout initialization.
- `STRIPE_SECRET_KEY`: **SECRET.** Server-side key for fulfilling intents and handling webhooks.

### External Integrations
- `RESEND_API_KEY`: For transactional email templates.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: For the `[[GameMap]]` location discovery.

### Feature Flags
- `ENABLE_EMAILS`: Toggle for Resend integration.
- `NEXT_TELEMETRY_DISABLED`: Disables Next.js anonymous stats.

---

> [!CAUTION]
> NEVER check actual values for these keys into version control. These keys dictate the platform's security and financial integrity.
