import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Disc3, Menu } from 'lucide-react'
import MenuDropdown from './menu-dropdown'
import HeaderSearch from './HeaderSearch'

import { useAuthStore } from '@/stores/authStore'
import DDNotificationList from '@/features/notifications/components/DDNotificationList'
import { useMobileSidebarStore } from '@/stores/mobileSidebarStore'
import Btn from '../ui/my-btn'

export default function Header() {
  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  const toggleMobileSidebar = useMobileSidebarStore((s) => s.toggle)

  useState(() => {
    const storedLanguage = window.localStorage.getItem('Lng')
    if (storedLanguage && storedLanguage !== i18n.language) {
      i18n.changeLanguage(storedLanguage)
    }
  })

  return (
    <div className="w-full flex sticky top-0 z-50 justify-center">
      <header className="w-full bg-level-2 text-text-main border-b border-level-3/40 px-2 sm:px-4 py-1.5 sm:py-2">
        <nav className="flex items-center justify-between w-full gap-1.5 sm:gap-3">
          {/* Left section: Sidebar toggle, Logo, Search */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
            {isAuthenticated && (
              <Btn
                onClick={toggleMobileSidebar}
                aria-label="Toggle menu"
                className="sm:hidden px-1 bg-level-2 rounded-md size-8 shrink-0 flex items-center justify-center"
              >
                <Menu className="size-4" />
              </Btn>
            )}

            <Link to="/" className="flex items-center gap-1.5 shrink-0 px-1">
              <Disc3 className="size-5 sm:size-6 text-level-3" />
              <h1 className="hidden sm:block text-base sm:text-lg font-bold text-transparent bg-gradient-to-r from-[var(--color-accent-2)] via-[var(--color-accent-3)] to-[var(--color-accent-1)] bg-clip-text leading-normal">
                {t('brand.name')} {t('brand.version')}
              </h1>
            </Link>

            <div className="flex items-center min-w-0">
              <HeaderSearch />
            </div>
          </div>

          {/* Right section: Auth/Unauth Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {!isAuthenticated ? (
              <div className="flex items-center gap-1.5 sm:gap-3">
                <select
                  value={i18n.language}
                  onChange={(e) => {
                    i18n.changeLanguage(e.target.value)
                    window.localStorage.setItem('Lng', e.target.value)
                  }}
                  className="bg-level-1 text-text-main text-xs sm:text-sm rounded-md px-1.5 py-1 border border-level-3/40 cursor-pointer outline-none"
                >
                  <option value="ru">RU</option>
                  <option value="en">EN</option>
                  <option value="ua">UA</option>
                </select>

                <button
                  type="button"
                  className="cursor-pointer text-xs sm:text-sm font-semibold hover:text-level-3 transition-colors"
                  onClick={() => navigate({ to: '/login' })}
                >
                  {t('nav.login')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-3">
                <DDNotificationList />
                <MenuDropdown />
              </div>
            )}
          </div>
        </nav>
      </header>
    </div>
  )
}
