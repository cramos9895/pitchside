# Deep Dive Report: The Infinite Loading Loop

## Findings

1.  **The Trigger**: The infinite loading loop on Vercel is caused by an unintended interaction between `router.refresh()` in `AuthButton.tsx` and the `useEffect` in `dashboard/page.tsx`.
2.  **The Mechanism**:
    *   In `AuthButton.tsx`, `supabase.auth.onAuthStateChange` listens for authentication events (like `SIGNED_IN` or `TOKEN_REFRESHED`).
    *   Previously, the kill-switch I added removed the check that ensures `router.refresh()` *only* fires when the `user.id` fundamentally changes.
    *   Because Vercel's environment forces a strict hydration cycle, `router.refresh()` causes the page's Server Components to re-render. This triggers a remount of your Client Components.
    *   When `AuthButton` remounts, the Supabase client re-initializes and fires `SIGNED_IN` again.
    *   This immediately triggers `router.refresh()` again, wiping the state.
3.  **The "Email Prefix" Symptom**:
    *   Because `AuthButton` is constantly unmounting and remounting every fraction of a second, the browser *cancels* the network request to fetch your `profiles` data (First Name, Last Name).
    *   When the request cancels, the data returns as `null`, causing the UI to fall back to `user.email?.split('@')[0]` (christian.ramos9895).
4.  **The Dashboard "Loading" Symptom**:
    *   Simultaneously, `dashboard/page.tsx`'s `useEffect` is triggered. It sets `loading` to `true`.
    *   Because the component is unmounted by the `router.refresh()` loop before it can finish fetching, `setLoading(false)` is never reached in a stable render. You are trapped seeing the spinner.

## Proposed Path Forward

We need to implement the strict **Supabase Next.js Event Gate**.

1.  **Modify `AuthButton.tsx`**: We must strictly compare the *current* session ID with the *previous* session ID. `router.refresh()` should **never** fire unless a user explicitly logs in, logs out, or switches accounts. It should completely ignore redundant `SIGNED_IN` or `TOKEN_REFRESHED` events if the `user.id` remains the same.
2.  **Remove `router` from Dependencies**: In `dashboard/page.tsx`, `router` is listed as a dependency in the `useEffect`. While Next.js 14 attempts to keep this stable, removing it ensures navigation events do not trigger a hard re-fetch of the dashboard data, preventing unnecessary loading spinners.

I will write a script to execute these surgical fixes.
