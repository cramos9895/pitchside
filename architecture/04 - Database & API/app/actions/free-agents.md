# ⚙️ free-agents

**Type:** #api #database #recruitment  
**Location:** `src/app/actions/free-agents.ts`

## 📄 Expected Payload / Schema

- **inviteFreeAgent**: `formData` (`freeAgentId`, `bookingGroupId`, `gameTitle`).

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Identity Integrity**: This action executes a server-side validation of both the **Caller** (the Captain) and the **Target** (the Free Agent). By re-fetching the `profiles` for both parties using the authenticated `user.id`, the system ensures that the invitation is contextually accurate (e.g., the Captain's actual name is included) and that the target email is valid before any external communication is dispatched.

## 🧪 Business Logic & Math

- **The "Digital Draft Notice"**:
    - This is the manual counterpart to the automated `[[house-team]]` logic. It empowers squad captains to curate their own rosters from the global talent pool.
- **Context-Aware URI Generation**:
    - The action dynamically constructs a recruitment gateway link: `/invite/${bookingGroupId}`. This link is the "Key" that allows the free agent to bypass the general marketplace and register specifically for the captain's squad within the designated `booking` context.
- **Transactional Communication**:
    - Utilizes the `sendNotification` utility to fire a specialized **Team Invite Template**. This ensures that recruitment notices are delivered via a high-reputation transactional email channel (Resend), including granular variables like `userName` (Captain) and `gameTitle` to maximize recruitment conversion.

## 🔄 Returns / Side Effects

- **Returns**: Standardized response `{ success: true }` upon successful email dispatch.
- **Side Effects**:
    - **External Delivery**: Triggers a transactional email to the free agent's registered address. Note: Unlike `[[join]]`, this action does not modify database state; it acts purely as a **Communication Bridge** to facilitate a future state change.

---

**`free-agents` is the platform's "Talent Matchmaker," providing the communication infrastructure needed to transform unassigned individuals into competitive squad members through direct, context-rich recruitment.**