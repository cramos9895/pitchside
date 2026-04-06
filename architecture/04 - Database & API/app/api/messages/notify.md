# ⚙️ /api/messages/notify

**Type:** #api #database #communication **Location:** `src/app/api/messages/notify/route.ts`

## 📄 Expected Payload / Schema

- **gameId** (UUID): The specific match or tournament chat room.
- **messageId** (UUID): The unique ID of the triggering message.
- **content** (string): The raw text of the message (for inclusion in the email).
- **isBroadcast** (boolean): Flag indicating the message should be sent to all participants.
- **hasHostTag** (boolean): Flag indicating the `@host` mention was used.

## 🛡️ Security & Permissions

- **RLS Policy**: Authentication is verified via `supabase.auth.getUser()`.
- **Sender Verification**: Retrieves the sender's actual profile name from the database to prevent identity spoofing in notification emails.
- **Recipient Isolation**: Uses a server-side `Set<string>` to deduplicate recipients and ensures the sender is never emailed their own message.

## 🧪 Business Logic & Math

- **The "Notification Router" Engine**:
    - Implements a conditional branching logic based on message intent:
        - **Broadcast Mode**: Performs a table scan on `bookings` for the current `gameId`, filtering for `status !== 'cancelled'`. This targets all active and waitlisted players.
        - **Host Tagging Logic**: If the message contains `@host`, it specifically reads the `host_ids` array from the parent `games` record and resolves those UUIDs to email addresses via the `profiles` table.
- **Batch Dispatch Simulation**:
    - Converts the `emailsToSend` set into an array of concurrent `sendNotification` promises. It uses `Promise.allSettled()` to ensure that a single failing email address doesn't crash the entire notification batch for other users.
- **Dynamic Content Injection**:
    - Tailors the email subject line based on the trigger:
        - Broadcast: `📢 Announcement: [Game Title]`
        - Host Mention: `💬 New message in [Game Title] (@host)`

## 🔄 Returns / Side Effects

- **Returns**: `NextResponse.json({ success: true, sentCount: number })`.
- **Side Effects**:
    - High-volume email dispatch through the platform's transactional mail provider.
    - Real-time audit log of notification volume (`sentCount`).

---

**`/api/messages/notify` is the platform's "Real-Time Courier," ensuring that critical match communication and host inquiries are delivered beyond the browser to the player's inbox.**