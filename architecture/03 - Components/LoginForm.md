# 🧩 LoginForm

**Type:** #component #identity
**Location:** `src/app/login/page.tsx`
**Last Audited:** 2026-04-10

## 📥 Props Received
- *Note: This is a standalone client component embedded in the Login Page.*

## 📝 Data Schema / Types
- uses `createClient` from `@/lib/supabase/client`.

## 🎨 Visual DNA (Layout & UI)
- **Container:** `w-full max-w-md bg-pitch-card border border-white/10 p-8 shadow-2xl relative z-10`
- **Background:** `bg-pitch-accent/5 blur-[100px] rounded-full` (Glow effect)
- **Input Fields:** `bg-black/50 border border-white/10 focus:border-pitch-accent text-white px-4 py-3 font-medium`
- **Primary CTA:** `bg-pitch-accent text-pitch-black font-black uppercase py-4 hover:bg-white`

## 🎛️ Local State & UI Logic
- **Auth Handling**: Uses `supabase.auth.signInWithPassword`.
- **Intelligent Redirection**: 
    - Redirects to `/facility` if the user has a `system_role` of `facility_admin` or `super_admin`.
    - Redirects to `/` (Home) for standard users.
- **Error Feedback**: Renders an inline red banner for failed auth attempts.

## 🔗 Used In (Parent Pages)
- [[Login Page]]

## ⚡ Actions & API Triggers
- `supabase.auth.signInWithPassword`: Validates credentials against Supabase Auth.
- `supabase.from('profiles').select('system_role')`: Fetches user permissions after successful login.
