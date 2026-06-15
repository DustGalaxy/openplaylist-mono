import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import History from '@/components/icons/icon-history'
import Logout from '@/components/icons/icon-logout'
import Settings from '@/components/icons/icon-settings'
import Statistic from '@/components/icons/icon-statistic'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuRadioItem,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { Languages } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'

export default function MenuDropdown() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()

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
  const currentLanguage = languages.find(
    (language) => language.code === i18n.language,
  )
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
          <div className="hidden sm:block text-lg">{user.username}</div>

          <div className=" rounded-full w-[33px] bg-level-3">
            <img src={user.avatar_url} className=" rounded-full" alt="" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        sideOffset={5}
        className="bg-level-2 border-level-3 text-text-main "
      >
        <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-level-3" />
        <DropdownMenuSub>
          <DropdownMenuGroup>
            <DropdownMenuSubTrigger
              className="flex gap-2 items-center 
            bg-level-2 text-text-main  
            data-[state=open]:bg-level-1  
            data-[state=open]:text-text-main  
            focus:text-text-main
            focus:bg-level-1"
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
        <DropdownMenuItem disabled>
          <Link to="/statistic" className="flex gap-2 items-center">
            <Statistic strokeWidth={3.5} /> {t('nav.statistic')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Link to="/history" className="flex gap-2 items-center">
            <History strokeWidth={3.5} /> {t('nav.history')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link to="/settings" className="flex gap-2 items-center">
            <Settings strokeWidth={3.5} /> {t('nav.settings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-level-3" />
        <DropdownMenuItem variant="destructive">
          <Link to="/logout" className="flex gap-2 items-center">
            <Logout strokeWidth={3.5} />
            {t('nav.logout')}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
