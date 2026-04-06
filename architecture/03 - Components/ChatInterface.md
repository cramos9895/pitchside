# 🧩 ChatInterface

**Type:** #component **Location:** `src/components/ChatInterface.tsx`

## 📥 Props Received

- **gameId** (string): The UUID of the specific event (Pickup, Tournament, or League).
- **currentUserId** (string): The UUID of the authenticated user.
- **isParticipant** (boolean): A primary access gate that enables or disables the input field and persistence layer.
- **isHost** (boolean): An authorization flag that unlocks administrative communication tools (Broadcasts).

## 🎛️ Local State & UI Logic

- **Real-Time Synchronicity**:
    - Implements a dedicated Supabase Realtime channel (`game-chat-[id]`) targeting the `messages` table.
    - **Atomic Profile Bridging**: Upon receiving a new message payload via the websocket, the component performs a quick, indexed lookup for the sender's `full_name` and `email` from the `profiles` table before appending it to the state. This ensures that even anonymous-looking raw table inserts are rendered with friendly display names.
- **Hybrid Communication Engine**:
    - **1. Standard Chat**: peer-to-peer communication among event participants.
    - **2. High-Visibility Broadcasts**: Accessible only to hosts (`isHost: true`). These messages are visually distinct (Red theme with `Megaphone` icons) and are flagged in the database as `is_broadcast: true`.
- **Intelligent Notification Hooks**:
    - **Tag Detection**: The component automatically scans the text buffer for the `@host` string. If detected, it triggers a background `fetch` to the `/api/messages/notify` endpoint to ensure the event organizer is alerted out-of-band (Email/Push).
    - **Broadcast Alerts**: Hosts can explicitly toggle an "Also Send Email Alert" checkbox during an announcement, which forces a platform-wide notification to all registered participants.
- **UX Continuity**:
    - Employs a `useRef` based auto-scroll anchor that pins the message buffer to the bottom whenever the `messages` array length changes, providing a "smooth" conversational experience.
- **Themed Aesthetic**:
    - Dynamically shifts the entire input area's border and button colors based on the active communication mode (Standard: `pitch-accent` vs. Broadcast: `red-500`).

## 🔗 Used In (Parent Pages)

- `src/components/public/PlayerCommandCenter.tsx`
- `src/app/games/[id]/page.tsx` (Public event view)

## ⚡ Actions & API Triggers

- **`supabase.from('messages').insert()`**: The primary data persistence hook.
- **`/api/messages/notify` (POST)**: The platform's async bridge for external communications (powered by Resend/Twilio).

---

**ChatInterface is the "Social Pulse" of the PitchSide platform, engineered to balance low-latency peer interaction with high-authority broadcast tools for organizers.**