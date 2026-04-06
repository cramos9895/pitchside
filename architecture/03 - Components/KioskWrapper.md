# 🧩 KioskWrapper

**Type:** #component **Location:** `src/components/facility/KioskWrapper.tsx`

## 📥 Props Received

- **children** (ReactNode): The interior check-in or operation dashboard components to be wrapped.

## 🎛️ Local State & UI Logic

- **`isFullscreen`**: Tracks the native browser fullscreen state via `document.fullscreenElement`.
- **Kiosk Mode Transformation**:
    - Implements a hardware-first layout shift that expands the container to `h-screen` and `w-full` while disabling body-level scrollbars to mimic a native iPad or Android tablet application.
- **Floating Tablet Control**:
    - A dedicated floating button in the bottom-right (`bottom: '2rem', right: '2rem'`) optimized for thumb-reach on large touchscreens.
    - Transitions from `absolute` to `fixed` positioning when in fullscreen mode to remain persistent over top of scrolling content.
- **Browser Event Sync**: Uses an `useEffect` listener for `fullscreenchange` to ensure the local React state remains synchronized if the user exits fullscreen via system-level gestures (e.g., swiping down or pressing `ESC`).
- **Visual Polish**: Employs `backdrop-blur-md` on the control button and a `duration-1000` fade-in animation to provide a premium, application-like experience.

## 🔗 Used In (Parent Pages)

- `src/app/facility/operations/page.tsx` (Primary Tablet Kiosk)
- `src/app/facility/admin/stats/page.tsx` (For scoreboard presentation)

## ⚡ Actions & API Triggers

- **`requestFullscreen()`**: A standard browser API call triggered by the user to enter immersive mode.
- **`exitFullscreen()`**: Reverts the browser to its standard windowed state.

---

**KioskWrapper is the structural glue that turns a standard web page into a high-performance, immersive tablet experience for facility check-in terminals.**