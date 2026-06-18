// ─── Theme system ─────────────────────────────────────────────────────────────
//
// Tailwind v4 @theme inline compiles CSS variables into static values at build
// time. To allow runtime theme switching we introduce a layer of --theme-*
// runtime variables on :root that the @theme inline tokens reference via var().
//
// styles.css must map:
//   --color-level-1:          var(--theme-level-1)
//   --color-level-2:          var(--theme-level-2)
//   --color-level-3:          var(--theme-level-3)
//   --color-level-4:          var(--theme-level-4)
//   --color-text-main:        var(--theme-text-main)
//   --color-text-secondary:   var(--theme-text-secondary)
//   --color-text-placeholder: var(--theme-text-placeholder)

export interface Theme {
  id: string
  name: string
  // Surfaces
  level1: string // page bg — deepest
  level2: string // cards, panels
  level3: string // accent — borders, CTAs, icons
  level4: string // muted accent — replaces level-3/40 opacity hacks
  // Text
  textMain: string
  textSecondary: string
  textPlaceholder: string
  // shadows
  shadow1: string
}

// ─── Built-in presets ────────────────────────────────────────────────────────

export const PRESET_THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Оранжевый огонь',
    level1: 'rgba(12, 12, 22, 1)',
    level2: 'rgba(29, 29, 44, 1)',
    level3: '#d14310',
    level4: 'rgba(209, 67, 16, 0.18)',
    textMain: 'rgba(255, 255, 255, 1)',
    textSecondary: 'rgba(160, 155, 180, 1)',
    textPlaceholder: 'rgba(255, 255, 255, 0.45)',
  },
  {
    id: 'midnight-purple',
    name: 'Ночной фиолет',
    level1: 'rgba(8, 8, 18, 1)',
    level2: 'rgba(22, 18, 38, 1)',
    level3: '#8b5cf6',
    level4: 'rgba(139, 92, 246, 0.18)',
    textMain: 'rgba(240, 238, 255, 1)',
    textSecondary: 'rgba(155, 145, 190, 1)',
    textPlaceholder: 'rgba(240, 238, 255, 0.4)',
  },
  {
    id: 'neon-rose',
    name: 'Неон розовый',
    level1: 'rgba(10, 8, 14, 1)',
    level2: 'rgba(26, 18, 32, 1)',
    level3: '#ec4899',
    level4: 'rgba(236, 72, 153, 0.18)',
    textMain: 'rgba(255, 240, 250, 1)',
    textSecondary: 'rgba(180, 145, 170, 1)',
    textPlaceholder: 'rgba(255, 240, 250, 0.4)',
  },
  {
    id: 'ocean-blue',
    name: 'Океанский синий',
    level1: 'rgba(6, 10, 20, 1)',
    level2: 'rgba(14, 24, 46, 1)',
    level3: '#3b82f6',
    level4: 'rgba(59, 130, 246, 0.18)',
    textMain: 'rgba(230, 240, 255, 1)',
    textSecondary: 'rgba(130, 155, 200, 1)',
    textPlaceholder: 'rgba(230, 240, 255, 0.4)',
  },
  {
    id: 'emerald',
    name: 'Изумруд',
    level1: 'rgba(6, 14, 10, 1)',
    level2: 'rgba(14, 30, 22, 1)',
    level3: '#10b981',
    level4: 'rgba(16, 185, 129, 0.18)',
    textMain: 'rgba(220, 255, 240, 1)',
    textSecondary: 'rgba(120, 175, 150, 1)',
    textPlaceholder: 'rgba(220, 255, 240, 0.4)',
  },
  {
    id: 'slate',
    name: 'Серый сланец',
    level1: 'rgba(10, 11, 14, 1)',
    level2: 'rgba(22, 24, 30, 1)',
    level3: '#94a3b8',
    level4: 'rgba(148, 163, 184, 0.18)',
    textMain: 'rgba(226, 232, 240, 1)',
    textSecondary: 'rgba(148, 163, 184, 1)',
    textPlaceholder: 'rgba(226, 232, 240, 0.4)',
  },
  {
    id: 'light-pure',
    name: 'Снежная классика',
    level1: 'rgba(255, 255, 255, 1)',
    level2: 'rgba(244, 244, 249, 1)',
    level3: '#2563eb',
    level4: 'rgba(37, 99, 235, 0.12)',
    textMain: 'rgba(15, 23, 42, 1)',
    textSecondary: 'rgba(100, 116, 139, 1)',
    textPlaceholder: 'rgba(15, 23, 42, 0.4)',
  },
  {
    id: 'light-mint',
    name: 'Свежая мята',
    level1: 'rgb(238, 246, 241)',
    level2: 'rgba(239, 242, 237, 1)',
    level3: '#059669',
    level4: 'rgba(5, 150, 105, 0.12)',
    textMain: 'rgba(11, 30, 24, 1)',
    textSecondary: 'rgba(71, 98, 89, 1)',
    textPlaceholder: 'rgba(11, 30, 24, 0.4)',
  },
  {
    id: 'light-amber',
    name: 'Теплый янтарь',
    level1: 'rgba(254, 253, 250, 1)',
    level2: 'rgba(249, 243, 235, 1)',
    level3: '#d97706',
    level4: 'rgba(217, 119, 6, 0.12)',
    textMain: 'rgba(30, 21, 10, 1)',
    textSecondary: 'rgba(115, 95, 75, 1)',
    textPlaceholder: 'rgba(30, 21, 10, 0.4)',
  },
]

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY_ACTIVE = 'theme-active-id'
const STORAGE_KEY_CUSTOM = 'theme-custom-list'

export function loadActiveThemeId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE) ?? 'default'
  } catch {
    return 'default'
  }
}

export function saveActiveThemeId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE, id)
  } catch {
    /* ignore */
  }
}

export function loadCustomThemes(): Theme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM)
    if (!raw) return []
    return JSON.parse(raw) as Theme[]
  } catch {
    return []
  }
}

export function saveCustomThemes(themes: Theme[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(themes))
  } catch {
    /* ignore */
  }
}

export function getAllThemes(): Theme[] {
  return [...PRESET_THEMES, ...loadCustomThemes()]
}

export function getThemeById(id: string): Theme {
  return getAllThemes().find((t) => t.id === id) ?? PRESET_THEMES[0]
}

// ─── Apply ────────────────────────────────────────────────────────────────────

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.style.setProperty('--theme-level-1', theme.level1)
  root.style.setProperty('--theme-level-2', theme.level2)
  root.style.setProperty('--theme-level-3', theme.level3)
  root.style.setProperty('--theme-level-4', theme.level4)
  root.style.setProperty('--theme-text-main', theme.textMain)
  root.style.setProperty('--theme-text-secondary', theme.textSecondary)
  root.style.setProperty('--theme-text-placeholder', theme.textPlaceholder)
}

// Apply saved theme immediately on import — before React hydration
if (typeof window !== 'undefined') {
  applyTheme(getThemeById(loadActiveThemeId()))
}
