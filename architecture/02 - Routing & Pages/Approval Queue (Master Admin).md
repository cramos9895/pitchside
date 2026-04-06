# 📄 Approval Queue (Master Admin)

**Path:** `src/app/admin/(dashboard)/requests/page.tsx` (Verification Command Center)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Master Portal Header:** A high-visibility header featuring a "Master Portal" badge and a **Pending Request Counter**. This counter provides immediate feedback on the administrative workload remaining in the queue.
    - **The Approval Queue (Data Table):** Optimized for high-speed administrative review using a table-based layout:
        - **Applicant Identity:** Displays the user's full name and email with a clean `User` avatar placeholder.
        - **Requested Role Badge:** A color-coded badge (`bg-blue-500/10`) showing the specific access level requested (e.g., "Facility Admin" vs. standard roles).
        - **Organization Context:** Dynamically reveals the **Organization Name** (`Org: [Name]`) associated with the applicant, allowing the agent to verify the legitimacy of the request against the facility database.
        - **Wait-Time Tracker:** Displays human-readable age of the request (e.g., "3 days ago") using `formatDistanceToNow` to assist with SLA compliance.
    - **Empty State (Queue Cleared):** A rewarding "Queue Empty" UI with a green `ShieldCheck` icon, providing a clear path back to the global `/admin/users` list once tasks are finished.
- **Action Nodes (Server-Action Buttons):**
    
    - **Approve (Green):** Executes the `approveUser` action, marking the profile as `verified`.
    - **Deny (Red):** Executes the `denyUser` action, rejecting the application.
- **Imported Custom Components:**
    
    - N/A (Uses standard semantic HTML5 table structure for accessibility and clarity).
- **Icons (lucide-react):**
    
    - `ShieldCheck`, `XCircle`, `Clock`, `User`, `Building`

## 🎛️ State & Variables

- **FIFO Queue Logic:**
    - The data is fetched using an `.order('updated_at', { ascending: true })` clause, enforcing a **First-In, First-Out** processing order.
- **Security Check:**
    - Access is strictly gated to users with `role === 'master_admin'` or `system_role === 'super_admin'`. Regular admins or hosts attempting to access this path are redirected to the root `/admin` dashboard.
- **Real-Time Synchronicity:**
    - **`revalidate = 0`**: Ensures the queue is never cached, preventing "Ghost Requests" (processed requests that still appear in the UI) and ensuring the counter is always accurate.

## 🔗 Links & Routing (Outbound)

- `/login` (Unauthenticated fallback)
- `/admin` (Redirect for standard host roles)
- `/admin/users` (Secondary navigation from empty state)

## ⚡ Server Actions / APIs Triggered

- [[approveUser]]: Elevates account status and unlocks facility management features for the applicant.
- [[denyUser]]: Rejects the application and notifies the system.
- [[createClient]]: Standard server-side auth client.

---

**The Approval Queue is the platform's primary gatekeeper, ensuring that only verified partners and valid facility administrators gain write-access to the system's core infrastructure.**