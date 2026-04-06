# 🗄️ Table: notifications

**Domain:** #database #ux #communication **Primary Key:** `id` (UUID)

## 📄 Column Definitions

|Column|Type|Description|
|---|---|---|
|**id**|`uuid`|Primary unique identifier for the alert.|
|**user_id**|`uuid`|(FK) The recipient profile record (`profiles` table).|
|**message**|`text`|The literal content to be displayed in the notification bell or popup.|
|**type**|`text`|Classification for UI styling: `info`, `success`, `warning`, `error`.|
|**is_read**|`boolean`|Flag used to manage unread counts and read/unread visual states.|
|**created_at**|`timestamp`|Auto-generated timestamp for chronological sorting.|

## 🔗 Relationships

- **belongs_to** profiles (`user_id`)

## 🛡️ RLS & Governance

- **Select**: Users can only read notifications where `user_id = auth.uid()`.
- **Update**: Restricted to the owner for marking as `is_read`.
- **Insert**: Generally restricted to **System-Level** calls using `createAdminClient()` (via `[[src/lib/notifications.ts]]`). This prevents users from spoofing alerts to other participants.

---

**The `notifications` table is the platform's "Async Communication Bridge," enabling real-time, non-intrusive feedback for players regarding roster changes, score updates, and waitlist promotions.**