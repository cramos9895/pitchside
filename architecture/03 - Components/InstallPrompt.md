# 🧩 InstallPrompt

**Type:** #component **Location:** `src/components/InstallPrompt.tsx`

## 📥 Props Received

- _None_: This component is designed as a standalone utility that self-manages its lifecycle and visibility based on browser environment variables.

## 🎛️ Local State & UI Logic

- **PWA Environment Detection**:
    - Implements a multi-stage sensing engine:
        - **Installed State**: Uses `display-mode: standalone` media queries to detect if the user is already within the PWA wrapper. If true, it renders a subtle "Installed & Active" badge to reassure the user.
        - **Android/Desktop**: Listens for the `beforeinstallprompt` event, capturing the native browser trigger for a one-click installation path.
        - **iOS Logic**: Uses user-agent sniffing to identify Apple devices. Since Safari does not support the native "Install" prompt API, the component automatically swaps its functional button for a "Deep-Link Instruction" set.
- **Cross-Platform Instructional UI**:
    - **iOS Workflow**: Displays a specialized `bg-pitch-accent/5` alert box with a two-step guide (1. Tap Share, 2. Add to Home Screen) to bypass Safari's prompt limitations.
    - **Native Flow**: Surfaces a high-impact "Install" button that triggers the standard Chrome/Edge/Android installation dialog.
- **Brand Continuity**:
    - Integrates the 192x192 PitchSide icon with a clean, `white/5` border and `animate-in` fade effect, ensuring the prompt feels like an integrated platform feature rather than a generic browser intrusive element.
- **Deferred Prompt Management**:
    - Gracefully handles the `deferredPrompt.userChoice` promise to clear the UI if a user successfully accepts or dismisses the native installer.

## 🔗 Used In (Parent Pages)

- `src/app/page.tsx` (Homepage Banner)
- `src/app/dashboard/page.tsx` (User Engagement Footer)

## ⚡ Actions & API Triggers

- **`deferredPrompt.prompt()`**: The standard PWA primitive for invoking the browser's native installation UI.
- **`window.matchMedia`**: Used for persistent environment state monitoring.

---

**InstallPrompt is the platform's primary bridge for mobile conversion, providing a zero-friction path from the mobile web to a dedicated, offline-capable app experience.**