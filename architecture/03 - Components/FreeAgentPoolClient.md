# 🧩 FreeAgentPoolClient

**Type:** #component #client 
**Location:** `src/app/free-agents/FreeAgentPoolClient.tsx`
**Last Audited:** 2026-04-10

## 📥 Props Received
- `initialAgents`: `Profile[]` - Data of players looking for teams.

## 📝 Data Schema / Types
- `interface Profile`
- uses `supabase` client for filtering.

## 🎨 Visual DNA (Layout & UI)
- **Container:** `max-w-7xl mx-auto py-12 px-6`
- **Filter Bar:** `flex flex-wrap gap-4 mb-10` - Allows filtering by `Skill Level` and `Position`.
- **Agent Cards:** Uses [[FreeAgentCard]] in a `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`.

## 🎛️ Local State & UI Logic
- **Filtering Agent**: `useState` tracks active filters; uses `useMemo` or client-side logic to prune the `initialAgents` array for performance.
- **Drafting Flow**: Admin-specific buttons ("Draft Player") appear for team captains viewing the pool.

## 🔗 Used In (Parent Pages)
- [[Free Agents Page]]

## ⚡ Actions & API Triggers
- **[[draft-free-agent]]**: Server action to move a player from the pool to a specific team roster.
