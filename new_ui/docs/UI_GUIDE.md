# OpenPlaylist UI Guide

Design reference for `new_ui`. Use this when building new pages, refactoring old screens, or reviewing PRs for visual consistency.

**Related:** [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) — directory and module structure.

---

## Design Principles

1. **Dark, layered surfaces:** Depth comes from `level-1` → `level-2` → inner panels, not from harsh borders everywhere.
2. **Orange (`level-3`) as accent:** Borders, button drop-shadows, icon highlights. Avoid unstyled red/green/blue blocks unless semantic (success/error).
3. **Gradients for brand moments:** Titles, eyebrow labels, empty-state hints. Avoid gradient on body paragraphs.
4. **Soft borders:** Prefer `border-white/5`, `border-level-3/35` on content panels; reserve thick `border-2 border-level-3` for marketing/footer shells.
5. **Internationalization & Typography:** Support multi-language strings (EN, RU, UA); keep labels concise and sentence-cased.

---

## Tokens

Defined in `src/styles.css` (`@theme inline`) and consumed as Tailwind utilities.

### Surfaces (Background Layers)

| Token | Tailwind | Hex / Value | Usage |
|---|---|---|---|
| Level 1 | `bg-level-1` | `#0c0c16` | Page canvas, inputs, deep insets |
| Level 2 | `bg-level-2` | `#1d1d2c` | Cards, headers, footers, panels |
| Level 3 | `bg-level-3`, `border-level-3`, `text-level-3` | `rgb(245, 106, 25)` | Accent orange — borders, CTA drop-shadows, icons |

Surface hierarchy: **page (`level-1`) → panel (`level-2`) → inset (`level-1/40` + thin border)**.

### Text

| Token | Tailwind | Usage |
|---|---|---|
| Primary | `text-text-main` | Headings, primary labels, values |
| Secondary | `text-text-secondary` | Descriptions, metadata, subtitles |
| Muted | `text-text-placeholder` | Placeholders, hints, section caps |
| Danger | `text-danger` / `bg-danger` | Destructive operations |

### Brand Gradients

| CSS Variable | Color |
|---|---|
| `--color-accent-1` | Purple `#8b5cf6` |
| `--color-accent-2` | Pink `#ec4899` |
| `--color-accent-3` | Blue `#3b82f6` |

Gradient direction: **pink → blue → purple** (`accent-2` → `accent-3` → `accent-1`).

---

## Buttons

### Primary CTA — `Btn` (`src/components/ui/my-btn.tsx`)
3D "press" style with orange bottom shadow (`theme(colors.level-3)`). Used for primary calls-to-action.

```tsx
<Btn
  text="Go to Playlists"
  className="px-6 h-14 text-lg font-bold bg-level-2 text-text-main"
  onClick={...}
/>
```

### Secondary / Ghost Link
```tsx
<Link
  to="/view"
  className="
    inline-flex items-center justify-center gap-2 h-14 px-6 rounded-(--rounded-std)
    border-2 border-level-3/70 bg-level-2/80 text-text-main font-medium
    hover:border-level-3 hover:bg-level-2 transition-colors
  "
>
```

---

## Status Badges

| State | Tailwind Style |
|---|---|
| Positive / Open | `border-emerald-400/25 bg-emerald-500/10 text-emerald-200/90` + green dot |
| Neutral / Closed | `border-white/10 bg-level-1/60 text-text-secondary` + gray dot |
| Info Chip | `border-level-3/20 bg-level-1/50 text-text-secondary` rounded-full `text-xs` |
