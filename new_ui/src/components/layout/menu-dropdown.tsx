import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Bug,
  ChartColumnIncreasing,
  Heart,
  History,
  Languages,
  LogOut,
  MessageSquare,
  Palette,
  Settings,
  Users,
} from 'lucide-react'
import { useCallback, useState, useMemo } from 'react'
import type { Theme } from '@/lib/themes'
import { useEffect } from 'react'
import { Move } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import type { MoveMethod } from '@/types/appSettings'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/authStore'
import {
  PRESET_THEMES,
  applyTheme,
  getThemeById,
  loadActiveThemeId,
  loadCustomThemes,
  saveActiveThemeId,
} from '@/lib/themes'
import FeedbackModal from '@/features/feedback/FeedbackModal'
import ContributorsModal from '@/features/feedback/ContributorsModal'
import SupportModal from '@/features/feedback/SupportModal'

// ─── ThemePicker ──────────────────────────────────────────────────────────────

// Твоя функция генерации темы
function generateTheme(
  accentHue: number,
  mode: 'light' | 'dark' = 'light',
): Theme {
  const bgHue = (accentHue - 20 + 360) % 360
  const textHue = (accentHue - 10 + 360) % 360

  let level1, level2, level3, level4, textMain, textSecondary, textPlaceholder

  if (mode === 'light') {
    level1 = `hsl(${bgHue}, 15%, 96%)`
    level2 = `hsl(${bgHue}, 18%, 90%)`
    level3 = `hsl(${accentHue}, 75%, 45%)`
    level4 = `hsl(${accentHue}, 75%, 45%, 0.12)`
    textMain = `hsl(${textHue}, 60%, 12%)`
    textSecondary = `hsl(${textHue}, 30%, 38%)`
    textPlaceholder = `hsl(${textHue}, 60%, 12%, 0.40)`
  } else {
    level1 = `hsl(${bgHue}, 35%, 7%)`
    level2 = `hsl(${bgHue}, 32%, 13%)`
    level3 = `hsl(${accentHue}, 75%, 50%)`
    level4 = `hsl(${accentHue}, 75%, 50%, 0.14)`
    textMain = `hsl(${textHue}, 80%, 95%)`
    textSecondary = `hsl(${textHue}, 35%, 66%)`
    textPlaceholder = `hsl(${textHue}, 80%, 95%, 0.40)`
  }

  return {
    id: `dynamic-${mode}-${accentHue}`,
    name: `Своя: ${mode === 'light' ? 'Светлая' : 'Тёмная'} (${accentHue}°)`,
    level1,
    level2,
    level3,
    level4,
    textMain,
    textSecondary,
    textPlaceholder,
  }
}

function ThemePicker() {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState<string>(loadActiveThemeId)

  // Состояние для кастомного пикера
  const [customHue, setCustomHue] = useState<number>(0)
  const [customMode, setCustomMode] = useState<'light' | 'dark'>('light')

  const handleSelect = useCallback((theme: Theme) => {
    setActiveId(theme.id)
    applyTheme(theme)
    saveActiveThemeId(theme.id)
  }, [])

  // Генерируем текущую кастомную тему на лету при изменении Hue или Mode
  const generatedTheme = useMemo(() => {
    const modeLabel =
      customMode === 'light'
        ? t('theme.light', 'Light')
        : t('theme.dark', 'Dark')
    const theme = generateTheme(customHue, customMode)
    theme.name = t('theme.custom', {
      mode: modeLabel,
      hue: customHue,
      defaultValue: `Custom: ${modeLabel} (${customHue}°)`,
    })
    return theme
  }, [customHue, customMode, t])

  // Переключатель режима для кастомной темы с автоматическим аплайем
  const handleModeToggle = useCallback(() => {
    const nextMode = customMode === 'light' ? 'dark' : 'light'
    setCustomMode(nextMode)
    const modeLabel =
      nextMode === 'light' ? t('theme.light', 'Light') : t('theme.dark', 'Dark')
    const nextTheme = generateTheme(customHue, nextMode)
    nextTheme.name = t('theme.custom', {
      mode: modeLabel,
      hue: customHue,
      defaultValue: `Custom: ${modeLabel} (${customHue}°)`,
    })
    handleSelect(nextTheme)
  }, [customHue, customMode, handleSelect, t])

  // Изменение Hue в инпуте с автоматическим аплайем
  const handleHueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(0, Math.min(360, Number(e.target.value) || 0))
      setCustomHue(val)
      const modeLabel =
        customMode === 'light'
          ? t('theme.light', 'Light')
          : t('theme.dark', 'Dark')
      const nextTheme = generateTheme(val, customMode)
      nextTheme.name = t('theme.custom', {
        mode: modeLabel,
        hue: val,
        defaultValue: `Custom: ${modeLabel} (${val}°)`,
      })
      handleSelect(nextTheme)
    },
    [customMode, handleSelect, t],
  )

  const customThemes = loadCustomThemes()
  // Добавляем сгенерированную тему прямо в общий список для удобного просмотра
  const allThemes = [...PRESET_THEMES, ...customThemes, generatedTheme]

  return (
    <div className="flex flex-col gap-2 p-1" style={{ width: 232 }}>
      {/* Список тем */}
      <div className="flex flex-col gap-1 max-h-70 overflow-y-auto pr-0.5">
        {allThemes.map((theme) => {
          const isActive = theme.id === activeId
          return (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme)}
              className={[
                'group flex items-center gap-3 px-3 py-2.5 rounded-(--rounded-std)',
                'transition-all text-left w-full shrink-0',
                isActive
                  ? 'bg-level-1 border border-accent/50'
                  : 'border border-transparent hover:bg-level-1/60 hover:border-white/8',
              ].join(' ')}
            >
              {/* Превью из трех точек */}
              <div className="flex items-center gap-1 shrink-0">
                <span
                  className="block rounded-full"
                  style={{
                    width: 10,
                    height: 10,
                    background: theme.level1,
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                />
                <span
                  className="block rounded-full"
                  style={{
                    width: 10,
                    height: 10,
                    background: theme.level2,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
                <span
                  className="block rounded-full"
                  style={{ width: 10, height: 10, background: theme.accent }}
                />
              </div>

              {/* Имя */}
              <span
                className={[
                  'flex-1 text-sm truncate transition-colors',
                  isActive
                    ? 'text-text-main font-medium'
                    : 'text-text-secondary group-hover:text-text-main',
                ].join(' ')}
              >
                {theme.name}
              </span>

              {/* Активная точка */}
              {isActive && (
                <span
                  className="block shrink-0 rounded-full"
                  style={{ width: 6, height: 6, background: theme.level3 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Интерактивный генератор тем внизу */}
      <div className="border-t border-white/8 pt-2.5 px-1 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">
            {t('theme.paletteTest', 'Palette Test')}
          </label>
          <button
            onClick={handleModeToggle}
            className="text-[10px] px-1.5 py-0.5 rounded bg-level-1 border border-white/8 hover:border-white/14 text-text-main transition-colors"
          >
            {customMode === 'light'
              ? `☀️ ${t('theme.light', 'Light')}`
              : `🌙 ${t('theme.dark', 'Dark')}`}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-placeholder select-none font-mono">
            H:
          </span>
          <input
            type="number"
            min="0"
            max="360"
            value={customHue}
            onChange={handleHueChange}
            className="flex-1 min-w-0 bg-level-1 border border-white/8 rounded px-1.5 py-0.5 text-xs text-text-main font-mono focus:outline-none focus:border-accent/50 text-right"
            placeholder="0-360"
          />
          <input
            type="range"
            min="0"
            max="360"
            value={customHue}
            onChange={handleHueChange}
            className="w-24 h-1 bg-level-1 accent-(--accent) rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  )
}

// ─── MenuDropdown ─────────────────────────────────────────────────────────────

const actionButtons = [
  {
    modal: 'feedback' as const,
    icon: MessageSquare,
    color: 'blue-500',
    labelKey: 'footer.feedback',
    fallback: 'Feedback',
  },
  {
    modal: 'bug' as const,
    icon: Bug,
    color: 'rose-500',
    labelKey: 'footer.bugReport',
    fallback: 'Bug report',
  },
  {
    modal: 'contributors' as const,
    icon: Users,
    color: 'green-500',
    labelKey: 'footer.contributors',
    fallback: 'Contributors',
  },
  {
    modal: 'support' as const,
    icon: Heart,
    color: 'red-500',
    labelKey: 'footer.support',
    fallback: 'Support',
  },
] as const

type ActiveModal = 'feedback' | 'bug' | 'contributors' | 'support' | null
export default function MenuDropdown() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  if (!user) return null
  const { settings, setSetting, loadSettings } = useAppSettingsStore()
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  useEffect(() => {
    void loadSettings()
  }, [loadSettings])
  const languages = [
    { code: 'ru', label: 'Русский' },
    { code: 'en', label: 'English' },
    { code: 'ua', label: 'Українська' },
  ]

  useState(() => {
    const storedLanguage = window.localStorage.getItem('Lng')
    if (storedLanguage && storedLanguage !== i18n.language) {
      i18n.changeLanguage(storedLanguage)
    }
  })

  const currentLanguage = languages.find((l) => l.code === i18n.language)

  const handleLanguageChange = (
    language: (typeof languages)[number]['code'],
  ) => {
    i18n.changeLanguage(language)
    window.localStorage.setItem('Lng', language)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div className="flex items-center gap-2">
          {/* <div className="hidden sm:block text-lg font-medium text-text-main">
            {user.username}
          </div> */}
          {/* hover:ring-accent hover:ring-2 transition-all */}
          <div className="rounded-full w-10 bg-accent -mr-1 ">
            <img src={user.avatar_url} className="rounded-full" alt="" />
          </div>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="end"
        sideOffset={5}
        className="bg-level-2 border-accent text-text-main"
      >
        <DropdownMenuLabel className="flex gap-2 items-center text-text-main text-[16px]">
          <div className="rounded-full w-8.5 bg-accent">
            <img src={user.avatar_url} className="rounded-full" alt="" />
          </div>
          {user.username}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-accent" />
        <div className="flex items-center gap-1">
          {actionButtons.map(
            ({ modal, icon: Icon, color, labelKey, fallback }) => (
              <button
                key={modal}
                type="button"
                onClick={() => setActiveModal(modal)}
                title={t(labelKey, fallback)}
                className="
                  inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5
                  text-xs text-text-secondary hover:text-text-main hover:bg-level-1
                  transition-colors 
                "
              >
                <Icon size={14} className={` text-${color} `} />
                <span className="hidden sm:inline">
                  {t(labelKey, fallback)}
                </span>
              </button>
            ),
          )}
        </div>
        <DropdownMenuSeparator className="bg-accent" />
        {/* Language picker */}
        <DropdownMenuSub>
          <DropdownMenuGroup>
            <DropdownMenuSubTrigger
              className="flex gap-2 items-center
              bg-level-2 text-text-main
              data-[state=open]:bg-level-1 data-[state=open]:text-text-main
              focus:text-text-main focus:bg-level-1"
            >
              <Languages size={16} />
              <span>{currentLanguage?.label}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="bg-level-2 text-text-main border-0">
                <DropdownMenuRadioGroup
                  value={currentLanguage?.code}
                  onValueChange={(value) => handleLanguageChange(value)}
                >
                  {languages.map((language) => (
                    <DropdownMenuRadioItem
                      key={language.code}
                      value={language.code}
                      className="text-text-main focus:text-text-main  focus:bg-level-1 bg-level-2"
                    >
                      {language.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuGroup>
        </DropdownMenuSub>

        {/* Theme picker */}
        <DropdownMenuSub>
          <DropdownMenuGroup>
            <DropdownMenuSubTrigger
              className="flex gap-2 items-center
              bg-level-2 text-text-main
              data-[state=open]:bg-level-1 data-[state=open]:text-text-main
              focus:text-text-main focus:bg-level-1"
            >
              <Palette size={16} />
              {t('nav.theme')}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                className="bg-level-2 text-text-main border border-white/10 p-2"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <ThemePicker />
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuGroup>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuGroup>
            <DropdownMenuSubTrigger
              className="flex gap-2 items-center
      bg-level-2 text-text-main
      data-[state=open]:bg-level-1 data-[state=open]:text-text-main
      focus:text-text-main focus:bg-level-1"
            >
              <Move size={16} />
              {t('nav.moveMethod.title')}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="bg-level-2 text-text-main border-0">
                <DropdownMenuRadioGroup
                  value={settings.moveMethod}
                  onValueChange={(value) =>
                    setSetting('moveMethod', value as MoveMethod)
                  }
                >
                  <DropdownMenuRadioItem
                    value="dnd"
                    className="text-text-main focus:text-text-main  focus:bg-level-1 bg-level-2"
                  >
                    {t('nav.moveMethod.dnd')}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="arrows"
                    className="text-text-main focus:text-text-main  focus:bg-level-1 bg-level-2"
                  >
                    {t('nav.moveMethod.arrows')}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuGroup>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => navigate({ to: '/statistic' })}>
          <ChartColumnIncreasing /> {t('nav.statistic')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: '/history' })}>
          <History /> {t('nav.history')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: '/settings' })}>
          <Settings /> {t('nav.settings')}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-accent" />

        <DropdownMenuItem
          variant="destructive"
          onClick={() => navigate({ to: '/logout' })}
        >
          <LogOut />
          {t('nav.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
      <FeedbackModal
        open={activeModal === 'feedback' || activeModal === 'bug'}
        onOpenChange={(open) => setActiveModal(open ? activeModal : null)}
        type={activeModal === 'bug' ? 'bug' : 'feedback'}
      />

      <ContributorsModal
        open={activeModal === 'contributors'}
        onOpenChange={(open) => setActiveModal(open ? 'contributors' : null)}
      />

      <SupportModal
        open={activeModal === 'support'}
        onOpenChange={(open) => setActiveModal(open ? 'support' : null)}
        onFeedbackClick={() => setActiveModal('feedback')}
      />
    </DropdownMenu>
  )
}
