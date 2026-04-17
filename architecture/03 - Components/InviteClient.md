# 🧩 InviteClient

**Type:** #component #client 
**Location:** `src/app/invite/[id]/InviteClient.tsx`
**Last Audited:** 2026-04-10

## 📥 Props Received
- `invite`: `InviteData` - The specific record from `invites` table.

## 📝 Data Schema / Types
- uses `createClient` for session checks.
- links to `profiles` and `teams` schemas.

## 🎨 Visual DNA (Layout & UI)
- **Container:** `min-h-screen bg-pitch-black flex items-center justify-center`
- **Invitation Card:** `max-w-md w-full bg-pitch-card border border-pitch-accent/20 p-8 text-center shadow-2xl hover:border-pitch-accent transition-all`
- **Avatar Cluster:** Renders the sender's profile image and organization logo.

## 🎛️ Local State & UI Logic
- **Session Check**: Verifies if the user is logged in. Redirects to `/login?next=...` if not.
- **Acceptance Flow**: Uses `action: acceptInvite` to join a team or staff roster.
- **Decline Path**: Redirects back to dashboard with a feedback toast.

## 🔗 Used In (Parent Pages)
- `src/app/invite/[id]/page.tsx`

## ⚡ Actions & API Triggers
- **[[acceptTeamInvite]]**: Server action for roster migration.
- **[[inviteFacilityStaff]]**: Trigger for administrative staffing.
