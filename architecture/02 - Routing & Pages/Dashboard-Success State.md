# 📄 Dashboard Success State

**Path:** `src/app/dashboard/page.tsx` (Success Feedback)

## 🧩 Components & UI

- **Major UI Sections:**
    
    - **Welcome Toast:** A dynamic, green-tinted notification (`border-green-500/50`) that slides in from the bottom-right to confirm a successful roster addition.
    - **Live Roster Update:** The "Next Up" section of the Player Hub automatically refreshes to display the newly joined tournament or team card, providing immediate visual confirmation.
    - **URL Cleanup:** The application performantly removes the `?success=team-joined` query string from the browser's address bar using `window.history.replaceState` as soon as the toast is triggered, ensuring a clean UX on subsequent refreshes.
- **Imported Custom Components:**
    
    - [[ToastProvider]]: Orchestrates the visual feedback.
    - [[DashboardContent]]: Wrapped in a **Suspense** boundary to handle the asynchronous detection of URL search parameters.
- **Icons (lucide-react):**
    
    - `CheckCircle`: Used within the toast to signify a successful transaction/join.

## 🎛️ State & Variables

- **Success Trigger Logic:**
    
    - **Detection:** The page uses the `useSearchParams` hook within a `useEffect` cordoned off for life-cycle management.
    - **Condition:** Specifically listens for the value `team-joined` assigned to the `success` parameter.
    - **Execution:** Triggers the `toastSuccess()` function with the message: _"Welcome to the squad! You've successfully joined the team."_
- **Technical Context:**
    
    - **Suspense Integration:** Because query parameters are accessed client-side in a Next.js App Router environment, the entire dashboard overview is wrapped in a `<Suspense>` boundary to prevent hydration mismatches and enable smooth loading states.

## 🔗 Links & Routing (Outbound)

- `window.location.pathname`: Used as the target for history replacement to strip the success flag while remaining on the dashboard.

## ⚡ Server Actions / APIs Triggered

- **Data Revalidation:** While the UI feedback happens on the dashboard, the data integrity is guaranteed by `revalidatePath('/dashboard')` called within the [[acceptTeamInvite]] server action prior to redirection.