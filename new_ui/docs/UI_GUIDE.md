# OpenPlaylist UI Guide

Design reference for `new_ui`. Use this when building new pages, refactoring old screens, or reviewing PRs for visual consistency.

**Related:** [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) — where files live.

---

## Design principles

1. **Dark, layered surfaces** — depth comes from `level-1` → `level-2` → inner panels, not from harsh borders everywhere.
2. **Orange (`level-3`) is an accent** — borders, button shadows, icon highlights. Avoid solid red/green/blue blocks unless they are semantic (success/error).
3. **Gradients for brand moments** — titles, eyebrow labels, empty-state hints. Do not gradient entire paragraphs of body text.
4. **Soft borders** — prefer `border-white/5`, `border-level-3/35` on content panels; reserve thick `border-2 border-level-3` for marketing/footer “hero” shells.
5. **Russian copy** — user-facing marketing and public views use Russian; keep labels short and sentence case in UI (not ALL CAPS except small section labels).

---

## Tokens

Defined in `src/styles.css` (`@theme inline`) and consumed as Tailwind utilities.

### Surfaces (background layers)

| Token | Tailwind | Hex / value | Use |
|-------|----------|-------------|-----|
| Level 1 | `bg-level-1` | `#0c0c16` | Page background, inputs, deepest inset |
| Level 2 | `bg-level-2` | `#1d1d2c` | Cards, header, footer, panels |
| Level 3 | `bg-level-3`, `border-level-3`, `text-level-3` | `rgb(245, 106, 25)` | Accent orange — borders, CTA shadow, icons |

Stack surfaces: **page (`level-1`) → panel (`level-2`) → inset (`level-1/40` + thin border)**. Never place a full `bg-level-1` block inside a heavy orange-bordered card without a reason (creates muddy contrast).

### Text

| Token | Tailwind | Use |
|-------|----------|-----|
| Primary | `text-text-main` | Headings, values, primary labels |
| Secondary | `text-text-secondary` | Descriptions, metadata |
| Muted | `text-text-placeholder` | Hints, placeholders, section labels |
| Danger | `text-danger` / `bg-danger` | Destructive actions only |

**Avoid** Tailwind `text-gray-*` on product screens — use `text-text-*` so contrast stays consistent.

### Brand gradients (accents)

| CSS variable | Color |
|--------------|-------|
| `--color-accent-1` | Purple `#8b5cf6` |
| `--color-accent-2` | Pink `#ec4899` |
| `--color-accent-3` | Blue `#3b82f6` |

Gradient direction: **pink → blue → purple** (`accent-2` → `accent-3` → `accent-1`).

### Radius & motion

| Token | Utility | Value |
|-------|---------|-------|
| Standard radius | `rounded-(--rounded-std)` or `rounded-[var(--rounded-std)]` | `11px` |
| Gradient shift | `animate-bg-move` | Text / bars |
| Gradient + glow | `animate-bg-move-w-shadow` | Large hero titles only |

---

## Shared layout utilities

Import from `@/features/landing/styles`:

```ts
import {
  gradientTextClass,
  panelClass,
  panelAccentClass,
  pageWrapClass,
  pageInnerClass,
} from '@/features/landing/styles'
```

| Export | Purpose |
|--------|---------|
| `gradientTextClass` | Animated gradient text (labels, links, hints) |
| `panelClass` | **Default** content card — soft orange border, subtle shadow |
| `panelAccentClass` | **Marketing** card — thick orange border (footer, emphasis blocks) |
| `pageWrapClass` | Page padding + `text-text-main` |
| `pageInnerClass` | `max-w-5xl mx-auto` content column |

### Page shell pattern

```tsx
<div className={pageWrapClass}>
  <div className={pageInnerClass}>
    <header className="text-center mb-8 sm:mb-10">
      <p className={`text-sm font-medium mb-3 ${gradientTextClass}`}>Eyebrow</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-text-main">Заголовок</h1>
      <p className="text-text-secondary max-w-xl mx-auto">Подзаголовок</p>
    </header>

    <section className={`p-6 sm:p-10 ${panelClass}`}>
      {/* content */}
    </section>
  </div>
</div>
```

**Reference implementations:** `src/routes/view.tsx`, `src/features/landing/home-page.tsx`.

### App shell

`src/routes/__root.tsx`:

```
bg-level-1 min-h-screen flex flex-col
  → Header (sticky)
  → main.flex-1 → Outlet
  → Footer
```

- **Header:** `src/components/layout/Header.tsx` — pill bar, `bg-level-2`, `border-2 border-level-3`, gradient logo.
- **Footer:** `src/components/layout/Footer.tsx` — `panelAccentClass`-style shell, gradient top bar.

---

## Typography scale

| Role | Classes | Example |
|------|---------|---------|
| Hero title | `text-5xl sm:text-6xl lg:text-7xl font-extrabold` + gradient + `animate-bg-move-w-shadow` | Landing `OPEN PLAYLIST` |
| Page title | `text-2xl sm:text-3xl font-bold text-text-main` | Playlist name on `/view` |
| Section title | `text-lg font-semibold text-text-main` | «Очередь треков» |
| Section label | `text-xs font-semibold uppercase tracking-wider text-text-placeholder` | «НАСТРОЙКИ ПЛЕЙЛИСТА» |
| Body | `text-sm sm:text-base text-text-secondary leading-relaxed` | Descriptions |
| Eyebrow | `text-xs font-medium uppercase tracking-wider` + `gradientTextClass` | «Плейлист», «Публичные плейлисты» |

Base font size on `body` is **18px** (`styles.css`).

---

## Panels & cards

### Default panel (`panelClass`)

Use for: view page sections, search results container, settings groups.

```
rounded-(--rounded-std)
border border-level-3/35
bg-level-2/95
shadow-[0_8px_32px_rgba(0,0,0,0.35)]
```

### Accent panel (`panelAccentClass`)

Use for: footer, landing feature callouts where brand border is intentional.

```
border-2 border-level-3
bg-level-2
shadow (offset negative — “lifted” look)
```

### Inner inset (nested inside a panel)

Pattern from `ViewInfoBar` — copy when you need stat tiles or empty states:

```
rounded-(--rounded-std)
border border-white/5
bg-level-1/40
backdrop-blur-sm
```

Hover on interactive cards:

```
hover:border-level-3/30
hover:shadow-[0_0_24px_rgba(236,72,153,0.12)]
```

### Ambient glow (optional, one per section)

Subtle depth without loud borders:

```tsx
<div
  className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-[var(--color-accent-3)] opacity-[0.07] blur-[80px]"
  aria-hidden
/>
```

Parent needs `relative overflow-hidden`.

---

## Buttons

### Primary CTA — `Btn` (`src/components/ui/my-btn.tsx`)

3D “press” style with orange bottom shadow (`theme(colors.level-3)`). Use for main actions.

```tsx
<Btn
  text="Перейти к плейлистам"
  className="px-6 h-14 text-lg font-bold bg-level-2 text-text-main"
  onClick={...}
/>
```

### Secondary / ghost link

Border + level-2 background, no 3D shadow:

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

### shadcn `Button`

Use inside modals/forms where the 3D `Btn` is too heavy (`src/components/ui/button.tsx`).

---

## Forms & search

**Search bar** (`src/features/public-playlist/components/searchbar.tsx`):

- Full-width `Input` with left Lucide icon
- `bg-level-1`, `border-2 border-level-3/70`, height `h-12`
- Submit via `Btn` or Enter; disable when empty / loading

**Do not** use the old expand-on-click search pattern for new screens.

---

## Status & badges

| State | Style |
|-------|--------|
| Positive / open | `border-emerald-400/25 bg-emerald-500/10 text-emerald-200/90` + small green dot |
| Neutral / closed | `border-white/10 bg-level-1/60 text-text-secondary` + gray dot |
| Info chip | `border-level-3/20 bg-level-1/50 text-text-secondary` rounded-full `text-xs` |

**Do not** use `bg-red-600` / `bg-green-600` pills for non-critical status.

### Active tab / filter

```txt
Active:   border-level-3/60 bg-level-1 shadow-[0_0_12px_rgba(245,106,25,0.15)]
Inactive: border-white/5 bg-level-1/30 text-text-secondary hover:border-level-3/30
```

---

## Icons

- **Brand / nav:** `src/components/icons/*` (e.g. `icon-disc`, `icon-search`)
- **UI metaphors:** `lucide-react` (feature cards, search, empty states)
- Icon container on cards:

```txt
h-10 w-10 rounded-(--rounded-std) bg-level-1 border border-level-3/40 text-level-3
group-hover: gradient background → icon turns level-1 colored
```

---

## Feature cards (landing grid)

See `src/features/landing/home-page.tsx` → `FeatureCard`:

- `panelClass`-like border on `bg-level-2`
- Icon in boxed chip, title `text-lg font-semibold`, body `text-sm text-text-secondary`
- Hover glow on border

---

## Lists & empty states

**Empty state block:**

```tsx
<div className={`text-center py-10 px-4 ${panelClass} border-dashed`}>
  <Icon className="h-10 w-10 text-text-placeholder mx-auto mb-3" />
  <p className="text-text-main font-medium">Заголовок</p>
  <p className="text-sm text-text-secondary mt-1">Пояснение</p>
</div>
```

Optional hint line with `gradientTextClass` (one short sentence max).

**Search results:** `src/features/public-playlist/components/search-playlist.tsx` — grid of linked cards, loading spinner, `notFound` panel.

---

## Public playlist view (`/view`)

| Area | File | Notes |
|------|------|-------|
| Route layout | `src/routes/view.tsx` | `pageWrapClass`, stacked `panelClass` sections |
| Playlist meta + settings | `src/features/public-playlist/components/ViewInfoBar.tsx` | No duplicate title; inner panels for stats |
| Track queue | same route | Separate panel; dashed empty queue |
| Search | `search-playlist.tsx` | `showHeader` prop when embedded |

Loader + `validateSearch({ p })` for playlist id. Show “not found” banner when `p` is set but loader returns null.

---

## Spacing & breakpoints

- Page horizontal padding: `px-4`
- Section vertical rhythm: `gap-8` between major blocks, `py-8 sm:py-10` on pages
- Content max width: **`max-w-5xl`** (aligned with header ~900px feel and footer)
- Grids: `sm:grid-cols-2`, `lg:grid-cols-3` or `lg:grid-cols-4` for cards
- Custom breakpoint (legacy): `[@media_(min-width:1150px)]:` — prefer standard `lg:` for new code

---

## Do / Don’t checklist

| Do | Don’t |
|----|--------|
| `text-text-main` / `text-text-secondary` | `text-gray-300`, `text-gray-400` |
| `border-level-3/35` on panels | Thick orange border on every inner box |
| `gradientTextClass` for short labels | Gradient on long body copy |
| `Btn` for primary actions | Random unstyled `<button>` |
| Import `panelClass` from `landing/styles` | Duplicate long class strings in every file |
| `Link` from TanStack Router | Raw `<a href="/view?p=">` for internal nav |
| Russian for public/marketing UI | Mixed EN/RU on same screen without reason |
| `key={item.id}` on lists | Missing keys on mapped components |

---

## Adding a new marketing page

1. Create route in `src/routes/`.
2. Build UI in `src/features/<name>/` (e.g. `home-page.tsx`).
3. Wrap with `pageWrapClass` + `pageInnerClass`.
4. Use `panelClass` for sections; `panelAccentClass` only for one hero highlight if needed.
5. Reuse `SearchPlaylist`, `Btn`, `gradientTextClass` where applicable.
6. Confirm footer/header still look correct (no double `min-h-screen` wrappers).

---

## Extending the design system

When a pattern appears **3+ times**, add it to `src/features/landing/styles.ts`:

```ts
export const innerPanelClass = 'rounded-(--rounded-std) border border-white/5 bg-level-1/40 backdrop-blur-sm'
export const sectionTitleClass = 'text-xs font-semibold uppercase tracking-wider text-text-placeholder mb-3'
```

Then import instead of copying strings from `ViewInfoBar`.

---

## File index (UI-related)

| Path | Role |
|------|------|
| `src/styles.css` | Global tokens, animations, scrollbar |
| `src/features/landing/styles.ts` | Shared Tailwind class strings |
| `src/features/landing/home-page.tsx` | Landing reference |
| `src/components/layout/Header.tsx` | Top nav |
| `src/components/layout/Footer.tsx` | Site footer |
| `src/components/ui/my-btn.tsx` | 3D CTA button |
| `src/components/ui/input.tsx` | Form inputs (shadcn) |
| `src/routes/view.tsx` | Public view layout reference |
| `src/features/public-playlist/components/ViewInfoBar.tsx` | Dense info layout reference |
| `src/features/public-playlist/components/search-playlist.tsx` | Search + result cards |

---

*Last updated: 2026 — reflects landing page, footer, `/view`, and `ViewInfoBar` redesign.*
