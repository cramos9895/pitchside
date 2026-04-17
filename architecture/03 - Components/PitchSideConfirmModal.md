# 🛡️ PitchSideConfirmModal

The primary interactive guard for all high-stakes or destructive user actions. This component replaces generic browser alerts to maintain the premium, high-contrast PitchSide aesthetic.

## 📐 Design Standards

- **Backdrop**: Dark translucent (`bg-black/90`) with glassmorphism (`backdrop-blur-sm`).
- **Container**: Obsidian elevated card (`#171717`) with subtle `white/10` borders.
- **Typography**: Titles must use the PitchSide **Oswald Heading** (Black/Italic/Uppercase) and bodies use **Inter**.
- **Actions**:
    - **Destructive**: Solid Red with high-contrast shadow.
    - **Standard**: Neon Green (#cbff00) primary action.
    - **Secondary**: Ghost buttons with subtle borders.

## 🚫 The Global Ban
As of **2026-04-12**, the use of `window.confirm()` and `alert()` is **PROHIBITED** in the codebase. All confirmation logic must utilize the `PitchSideConfirmModal` to ensure:
1.  Brand consistency.
2.  Accessibility compatibility.
3.  Non-blocking execution of background processes (like Stripe webhooks).

## 🛠️ Implementation Example

```tsx
<PitchSideConfirmModal
  isOpen={isModalOpen}
  onClose={() => setOpen(false)}
  onConfirm={handleAction}
  isDestructive={true}
  title="Disband Team"
  description="This action will release all players to the Free Agent pool."
/>
```

### Reference:
- **Location**: `src/components/public/PitchSideConfirmModal.tsx`
- **Related Logic**: [[RollingLeagueLobby]], [[CaptainDashboard]]
