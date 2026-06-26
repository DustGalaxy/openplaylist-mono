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
    // Сплит-комплементар: оранж (#d14310) → сине-фиолет на фонах
    level1: 'hsl(240, 30%, 7%)', // ~rgb(13,12,23) — тёмный индиго
    level2: 'hsl(248, 28%, 13%)', // ~rgb(25,23,42) — чуть теплее к акценту
    level3: '#d14310',
    level4: 'rgba(209, 67, 16, 0.16)',
    textMain: 'hsl(22, 100%, 96%)', // тёплый белый, тонирован в сторону оранжа
    textSecondary: 'hsl(22, 28%, 68%)', // приглушённый персиково-терракот
    textPlaceholder: 'hsla(22, 100%, 96%, 0.38)',
  },
  {
    id: 'midnight-purple',
    name: 'Ночной фиолет',
    // Монохром + аналог: фиолет → глубокий индиго на фонах
    level1: 'hsl(255, 38%, 7%)',
    level2: 'hsl(258, 36%, 14%)',
    level3: '#8b5cf6',
    level4: 'rgba(139, 92, 246, 0.16)',
    textMain: 'hsl(255, 80%, 96%)', // лавандово-белый
    textSecondary: 'hsl(255, 38%, 72%)',
    textPlaceholder: 'hsla(255, 80%, 96%, 0.38)',
  },
  {
    id: 'neon-rose',
    name: 'Неон розовый',
    // Сплит-комплементар: роза (#ec4899) → пурпурно-фиолет на фонах
    level1: 'hsl(288, 38%, 7%)',
    level2: 'hsl(292, 34%, 13%)',
    level3: '#ec4899',
    level4: 'rgba(236, 72, 153, 0.16)',
    textMain: 'hsl(330, 100%, 96%)', // розово-белый
    textSecondary: 'hsl(320, 32%, 70%)',
    textPlaceholder: 'hsla(330, 100%, 96%, 0.38)',
  },
  {
    id: 'ocean-blue',
    name: 'Океанский синий',
    // Монохром + аналог: синий → глубокий navy
    level1: 'hsl(224, 54%, 6%)',
    level2: 'hsl(222, 50%, 13%)',
    level3: '#3b82f6',
    level4: 'rgba(59, 130, 246, 0.16)',
    textMain: 'hsl(218, 100%, 96%)', // ледяной белый
    textSecondary: 'hsl(218, 44%, 70%)',
    textPlaceholder: 'hsla(218, 100%, 96%, 0.38)',
  },
  {
    id: 'emerald',
    name: 'Изумруд',
    // Монохром зелёный: изумруд → тёмный лес
    level1: 'hsl(158, 44%, 5%)',
    level2: 'hsl(160, 40%, 10%)',
    level3: '#10b981',
    level4: 'rgba(16, 185, 129, 0.16)',
    textMain: 'hsl(160, 80%, 94%)', // мятно-белый
    textSecondary: 'hsl(160, 30%, 64%)',
    textPlaceholder: 'hsla(160, 80%, 94%, 0.38)',
  },
  {
    id: 'slate',
    name: 'Серый сланец',
    // Нейтральный холодный монохром
    level1: 'hsl(220, 16%, 7%)',
    level2: 'hsl(220, 14%, 13%)',
    level3: '#94a3b8',
    level4: 'rgba(148, 163, 184, 0.16)',
    textMain: 'hsl(214, 28%, 90%)',
    textSecondary: 'hsl(214, 20%, 66%)',
    textPlaceholder: 'hsla(214, 28%, 90%, 0.38)',
  },
  {
    id: 'light-pure',
    name: 'Снежная классика',
    // Монохром холодный: белый → синяя сталь на карточках
    level1: 'hsl(0, 0%, 100%)',
    level2: 'hsl(220, 40%, 96%)', // еле заметный холодный тинт
    level3: '#2563eb',
    level4: 'rgba(37, 99, 235, 0.10)',
    textMain: 'hsl(224, 60%, 12%)', // тёмно-синий — не чистый чёрный
    textSecondary: 'hsl(220, 24%, 44%)',
    textPlaceholder: 'hsla(224, 60%, 12%, 0.38)',
  },
  {
    id: 'light-mint',
    name: 'Свежая мята',
    // Монохром зелёный светлый
    level1: 'hsl(150, 34%, 91%)',
    level2: 'hsl(152, 30%, 86%)', // карточки темнее фона — правильный порядок
    level3: '#059669',
    level4: 'rgba(5, 150, 105, 0.10)',
    textMain: 'hsl(158, 60%, 10%)',
    textSecondary: 'hsl(156, 30%, 32%)',
    textPlaceholder: 'hsla(158, 60%, 10%, 0.38)',
  },
  {
    id: 'light-amber',
    name: 'Тёплый янтарь',
    // Монохром тёплый: кремовый → насыщенный янтарь
    level1: 'hsl(40, 60%, 98%)',
    level2: 'hsl(38, 50%, 92%)',
    level3: '#d97706',
    level4: 'rgba(217, 119, 6, 0.10)',
    textMain: 'hsl(30, 80%, 10%)',
    textSecondary: 'hsl(32, 38%, 36%)',
    textPlaceholder: 'hsla(30, 80%, 10%, 0.38)',
  },
  {
    id: 'red-light-analogous',
    name: 'Red Light',
    level1: 'hsl(340, 15%, 96%)',
    level2: 'hsl(340, 18%, 90%)',
    level3: 'hsl(0, 75%, 45%)',
    level4: 'hsl(0, 75%, 45%, 0.12)',
    textMain: 'hsl(350, 60%, 12%)',
    textSecondary: 'hsl(345, 30%, 38%)',
    textPlaceholder: 'hsl(350, 60%, 12%, 0.40)',
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
