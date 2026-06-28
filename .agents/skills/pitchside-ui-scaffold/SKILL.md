---
name: pitchside-ui-scaffold
description: Use this skill when asked to create, modify, or scaffold new user interface components or pages for the PitchSide project.
---

# PitchSide UI Scaffold Protocol

When scaffolding or modifying UI components and pages, adhere to the following PitchSide-specific design system guidelines.

## Brand Identity & Colors
- **Primary Black (`--color-pitch-black`):** Use `#0a0a0a` as the deep charcoal background default (not pure black `#000000`).
- **Card Gray (`--color-pitch-card`):** Use `#171717` for containers and sections.
- **Electric Volt (`--color-pitch-accent`):** Use `#ccff00` (or `#cbff00`) as the main highlight/action color.
- **Muted Gray (`--color-pitch-secondary`):** Use `#a3a3a3` for secondary text and icons.
- **Default Text:** Use `#ffffff` for standard text against the dark background.

## Typography
- **Headings:** Use the `Oswald` font (Bold/Condensed) for primary headers (e.g., `<h1 className="font-oswald font-bold uppercase italic ...">`).
- **Body:** Use `Inter` font (Clean sans-serif) for body text, automatically imported at the root.

## Interactive Elements
- **Buttons (CSS Gradient Trap):** For primary Electric Volt buttons, use a flat-looking gradient trap `linear-gradient(#ccff00, #ccff00)` to ensure consistent rendering across browsers and themes.

## Spacing & Layout
- **Mobile-Responsive Padding:** Ensure layout containers use responsive padding:
  - `p-4` on mobile
  - `p-8` on desktop (e.g., `p-4 md:p-8`)
- **No Complex Gradients:** Avoid multi-color gradients (other than the flat solid gradient trap) to maintain a premium, clean, high-contrast, flat look.
