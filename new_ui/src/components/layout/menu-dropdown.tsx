import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ChartColumnIncreasing,
  History,
  Languages,
  LogOut,
  Palette,
  Settings,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import type { Theme } from '@/lib/themes'

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

// ─── ThemePicker ──────────────────────────────────────────────────────────────

function ThemePicker() {
  const [activeId, setActiveId] = useState<string>(loadActiveThemeId)

  const handleSelect = useCallback((theme: Theme) => {
    setActiveId(theme.id)
    applyTheme(theme)
    saveActiveThemeId(theme.id)
  }, [])

  const customThemes = loadCustomThemes()
  const allThemes = [...PRESET_THEMES, ...customThemes]

  return (
    <div className="flex flex-col gap-2 p-1" style={{ width: 232 }}>
      {/* Theme cards */}
      <div className="flex flex-col gap-1">
        {allThemes.map((theme) => {
          const isActive = theme.id === activeId
          return (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme)}
              className={[
                'group flex items-center gap-3 px-3 py-2.5 rounded-[var(--rounded-std)]',
                'transition-all text-left',
                isActive
                  ? 'bg-level-1 border border-level-3/50'
                  : 'border border-transparent hover:bg-level-1/60 hover:border-white/8',
              ].join(' ')}
            >
              {/* Three-dot surface preview */}
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
                  style={{ width: 10, height: 10, background: theme.level3 }}
                />
              </div>

              {/* Name */}
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

              {/* Active dot */}
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

      {/* Footer hint — editor coming later */}
      <div className="border-t border-white/8 pt-2 px-1">
        <p className="text-[11px] text-text-placeholder leading-snug">
          Редактор тем появится позже
        </p>
      </div>
    </div>
  )
}

// ─── MenuDropdown ─────────────────────────────────────────────────────────────

export default function MenuDropdown() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  if (!user) return null

  const languages = [
    { code: 'ru', label: 'Русский' },
    { code: 'en', label: 'English' },
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
          <div className="hidden sm:block text-lg font-medium text-text-main">
            {user.username}
          </div>
          <div className="rounded-full w-[33px] bg-level-3">
            <img src={user.avatar_url} className="rounded-full" alt="" />
          </div>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        sideOffset={5}
        className="bg-level-2 border-level-3 text-text-main"
      >
        <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-level-3" />

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
                      className="text-text-main focus:bg-level-3 bg-level-2"
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

        <DropdownMenuItem
          disabled
          onClick={() => navigate({ to: '/statistic' })}
        >
          <ChartColumnIncreasing /> {t('nav.statistic')}
        </DropdownMenuItem>
        <DropdownMenuItem disabled onClick={() => navigate({ to: '/history' })}>
          <History /> {t('nav.history')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate({ to: '/settings' })}>
          <Settings /> {t('nav.settings')}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-level-3" />

        <DropdownMenuItem
          variant="destructive"
          onClick={() => navigate({ to: '/logout' })}
        >
          <LogOut />
          {t('nav.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
