import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import Disc from '@/components/icons/icon-disc'
import MenuDropdown from './menu-dropdown'

import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'
import { Search, Turntable } from 'lucide-react'
import DDNotificationList from '@/features/notifications/components/DDNotificationList'

export default function Header() {
  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const windowWidth = window.innerWidth

  useState(() => {
    const storedLanguage = window.localStorage.getItem('Lng')
    if (storedLanguage && storedLanguage !== i18n.language) {
      i18n.changeLanguage(storedLanguage)
    }
  })
  return (
    <div className="w-full flex sticky top-0 z-50 justify-center">
      <header
        className="px-1 py-2 mx-5 mt-2 flex 
      w-full md:w-225 rounded-full bg-level-2 
      text-text-main text-2xl justify-between
      border-2 border-level-3 
      sm:shadow-[-2px_2px_10px_rgba(0,0,0,0.15),-2px_2px_4px_rgba(0,0,0,0.15)]"
      >
        <nav className="flex flex-row justify-between w-full @container  gap-2  items-center">
          <div className="flex gap-2">
            <div className="px-2 ">
              <Link to="/" className="flex gap-2 items-center">
                <Disc />
                <h1
                  className="hidden @[400px]:block text-lg sm:text-xl font-bold text-center h-full text-transparent  relative drop-shadow-2xl
                  bg-linear-to-r from-(--color-accent-2) via-(--color-accent-3) to-(--color-accent-1)  
                  bg-clip-text bg-size-[200%_auto]  leading-normal animate-bg-move transition-all"
                >
                  {windowWidth > 400 && t('brand.name')}
                  {windowWidth > 600 && t('brand.version')}
                </h1>
              </Link>
            </div>

            {isAuthenticated && (
              <div className="px-2 flex place-content-center ">
                <Link to="/dashboard" className="flex items-center">
                  <Turntable className="w-8 h-8 stroke-[1.2]" />
                </Link>
              </div>
            )}

            <div className="px-2 flex place-content-center ">
              <Link
                to="/view"
                className="flex items-center"
                search={{ p: undefined }}
              >
                <Search className="w-8 h-8 stroke-[1.2]" />
              </Link>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            {!isAuthenticated ? (
              <div className="flex items-center gap-4 pr-4">
                <select
                  value={i18n.language}
                  onChange={(e) => {
                    i18n.changeLanguage(e.target.value)
                    window.localStorage.setItem('Lng', e.target.value)
                  }}
                  className="bg-level-2 text-text-main text-base rounded-md p-1 border border-level-3/40 cursor-pointer outline-none"
                >
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>

                <button
                  className="cursor-pointer text-base sm:text-lg"
                  onClick={() => navigate({ to: '/login' })}
                >
                  {t('nav.login')}
                </button>
              </div>
            ) : (
              <div className="flex gap-2 h-8.25 items-center">
                <div className="px-2 gap-4  flex items-center">
                  <DDNotificationList />
                  <MenuDropdown />
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>
    </div>
  )
}
